"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { useAnnotations } from "./AnnotationStore";
import TagOverlay from "./TagOverlay";
import TagForm from "./TagForm";
import MeasurementForm from "./MeasurementForm";
import { SCALE_FACTORS } from "./types";

// ─── Dimension Line Helpers ───────────────────────────────────────────────────

/**
 * Helper to draw a solid 3D line between two Vector3 points.
 * Used for drawing distance measurement lines between Point A and Point B.
 */
function createDimLine(a, b, color = 0xffffff) {
  const geometry = new THREE.BufferGeometry().setFromPoints([a, b]);
  const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
  return new THREE.Line(geometry, material);
}

/**
 * Helper to create a 3D pin to indicate measurement endpoints.
 * Styled to look like a classic "map pointer" symbol.
 */
function createDimPin(pos, color = 0xffffff, scale = 1.0) {
  const group = new THREE.Group();

  const radius = 0.04;
  const height = 0.15;

  // High-poly head with Phong shading for a premium rounded look
  const headGeo = new THREE.SphereGeometry(radius, 16, 16);
  const headMat = new THREE.MeshPhongMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.4,
  });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, height, 0);

  // The tapering body connecting to the exact coordinate
  const bodyGeo = new THREE.ConeGeometry(radius * 0.95, height, 16);
  const bodyMat = new THREE.MeshPhongMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.4,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.x = Math.PI;
  body.position.set(0, height / 2, 0);

  group.add(body);
  group.add(head);
  group.position.copy(pos);
  group.scale.set(scale, scale, scale);

  return group;
}

/**
 * EditorCanvas Component
 *
 * The heavyweight heart of the 3D model editor. It manages:
 * - The Three.js WebGL context, scene, camera, and lighting
 * - Loading and displaying the central 3D model
 * - The animation loop (requestAnimationFrame)
 * - Mouse raycasting to detect 3D coordinates based on 2D screen clicks
 * - Handling active tools (Select, Tag, Measure, Paint)
 * - Projecting 3D world coordinates back to 2D screen space for HTML overlays
 */
export default function EditorCanvas({ modelUrl }) {
  // Subscribe to the global editor state (Context/Reducer)
  const { state, dispatch, sceneRef: globalSceneRef } = useAnnotations();

  // DOM Layout Refs
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // === Three.js Object Refs ===
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const modelGroupRef = useRef(null);

  // Math utilities kept outside of loop to avoid GC pausing
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());
  const animFrameRef = useRef(0);

  // === Measurement & Overlay Refs ===
  const dimLinesRef = useRef(new Map());
  const pointASphereRef = useRef(null);
  const previewObjectsRef = useRef([]);
  const gridRef = useRef(null);

  // === React State ===
  const [tagPositions, setTagPositions] = useState(new Map());

  // ─── Loading / Error state ───
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // ─── Pending tag form ───
  const [pendingTagLocal, setPendingTagLocal] = useState(null);

  // ─────────────────────────────── Scene Init ───────────────────────────────
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;

    // --- Core Scene ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0e12);
    sceneRef.current = scene;
    if (globalSceneRef) globalSceneRef.current = scene;

    // --- Grid Floor ---
    const grid = new THREE.GridHelper(20, 40, 0x333355, 0x222233);
    gridRef.current = grid;
    grid.visible = state.showGrid !== false;
    scene.add(grid);

    // --- Camera ---
    const { width: initW, height: initH } = container.getBoundingClientRect();
    const camera = new THREE.PerspectiveCamera(
      55,
      initW / initH || 1,
      0.01,
      2000,
    );
    camera.position.set(0, 2, 6);
    cameraRef.current = camera;

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(initW, initH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;

    // --- Lighting Array ---
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 2.5);
    dir.position.set(8, 12, 8);
    dir.castShadow = true;
    scene.add(dir);

    const fill = new THREE.DirectionalLight(0x8899ff, 0.3);
    fill.position.set(-5, 3, -5);
    scene.add(fill);

    // --- Orbital Camera Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.listenToKeyEvents(window);
    controls.keyPanSpeed = 15.0;
    controlsRef.current = controls;

    controls.addEventListener("start", () =>
      dispatch({ type: "SET_INTERACTING", payload: true }),
    );
    controls.addEventListener("end", () =>
      dispatch({ type: "SET_INTERACTING", payload: false }),
    );

    // --- Model Loading ---
    const loader = new GLTFLoader();
    setLoading(true);

    // Guard: Check if modelUrl is available
    if (!modelUrl) {
      console.warn("EditorCanvas: No modelUrl provided");
      setLoading(false);
      return;
    }

    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;
        modelGroupRef.current = model;

        // Auto-Center and Auto-Scale
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        const fov = camera.fov * (Math.PI / 180);
        const dist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.2;

        camera.position.set(center.x, center.y + maxDim * 0.3, center.z + dist);
        camera.lookAt(center);
        camera.updateProjectionMatrix();
        controls.target.copy(center);

        model.position.sub(center);

        // Prepare Meshes
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material && "color" in child.material) {
              child._origColor = child.material.color.clone();
            }
          }
        });

        scene.add(model);
        setLoading(false);
      },
      undefined,
      (err) => {
        console.error("Model load error:", err);
        setLoadError("Failed to load model.");
        setLoading(false);
      },
    );

    // ─── Animation loop (The Engine) ───
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);

      // --- Project 3D Tag Coordinates to 2D Screen Space ---
      if (cameraRef.current && containerRef.current) {
        const cam = cameraRef.current;
        const rect = container.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        const newMap = new Map();

        tagsSnapshotRef.current.forEach((tag) => {
          const wp = new THREE.Vector3(...tag.worldPosition);
          const proj = wp.clone().project(cam);
          const x = ((proj.x + 1) / 2) * w;
          const y = ((-proj.y + 1) / 2) * h;
          const visible = proj.z < 1 && proj.z > -1;
          newMap.set(tag.id, { x, y, visible });
        });

        setTagPositions(newMap);
      }
    };
    animate();

    // ─── Resize Handler (ResizeObserver) ───────────────────────────────────
    // window.addEventListener('resize') is NOT sufficient here because:
    //   1. It doesn't fire when the flex layout first settles after mount,
    //      meaning the renderer is permanently initialised at the wrong size.
    //   2. It doesn't fire when the Toolbar (a flex sibling) resizes the canvas
    //      container without changing the window dimensions.
    // ResizeObserver fires on the container element itself, immediately after
    // layout resolves — covering both cases.
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !cameraRef.current || !rendererRef.current) return;
      // Use contentRect for the live, post-layout dimensions.
      const w = entry.contentRect.width;
      const h = entry.contentRect.height;
      if (w === 0 || h === 0) return; // guard: flex not yet settled
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    });
    resizeObserver.observe(container);

    // ─── Disassembly / Cleanup ───
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      renderer.dispose();
      controls.dispose();
      scene.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl]);

  // ─── Maintain a React-Ref duplicate of Reducer state ───────────────────
  const tagsSnapshotRef = useRef(state.tags);
  useEffect(() => {
    tagsSnapshotRef.current = state.tags;
  }, [state.tags]);

  // ─── React Effect: Toggle Grid Visibility ──────────────────────────────
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.visible = state.showGrid;
    }
  }, [state.showGrid]);

  // ─── React Effect: Render Dimension Lines into 3D Space ───────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const existing = dimLinesRef.current;

    existing.forEach((objs, id) => {
      if (!state.measurements.find((m) => m.id === id)) {
        objs.forEach((o) => scene.remove(o));
        existing.delete(id);
      }
    });

    state.measurements.forEach((m) => {
      if (!existing.has(m.id)) {
        const a = new THREE.Vector3(...m.pointA);
        const b = new THREE.Vector3(...m.pointB);

        const line = createDimLine(a, b);
        const pA = createDimPin(a, 0xffffff, 0.4);
        const pB = createDimPin(b, 0xffffff, 0.4);

        scene.add(line, pA, pB);
        existing.set(m.id, [line, pA, pB]);
      }
    });
  }, [state.measurements]);

  // ─── React Effect: Render the "Point A" preview sphere ─────────────────────
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (pointASphereRef.current) {
      scene.remove(pointASphereRef.current);
      pointASphereRef.current = null;
    }

    if (state.measurePointA) {
      const pin = createDimPin(
        new THREE.Vector3(...state.measurePointA),
        0xaaaaaa,
        0.8,
      );
      scene.add(pin);
      pointASphereRef.current = pin;
    }
  }, [state.measurePointA]);

  // ─── React Effect: Handle Mesh Highlighting (Select & Paint Tools) ──────────
  useEffect(() => {
    const model = modelGroupRef.current;
    if (!model) return;

    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const mat = child.material;
      const mark = state.componentMarks[child.name];

      if (state.selectedMeshName === child.name) {
        mat.emissive = new THREE.Color(0xffffff);
        mat.emissiveIntensity = 0.15;
      } else if (mark) {
        mat.emissive = new THREE.Color(mark.highlightColour);
        mat.emissiveIntensity = 0.2;
      } else {
        mat.emissive = new THREE.Color(0x000000);
        mat.emissiveIntensity = 0;
      }
    });
  }, [state.selectedMeshName, state.componentMarks]);

  // ─── Event Handlers for Tools ───────────────────────────────────────────────

  const getRaycastHit = useCallback((e) => {
    const container = containerRef.current;
    if (!container || !cameraRef.current) return null;

    const rect = container.getBoundingClientRect();
    pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(pointerRef.current, cameraRef.current);
    const targets = modelGroupRef.current ? [modelGroupRef.current] : [];
    const hits = raycasterRef.current.intersectObjects(targets, true);
    return hits.length > 0 ? hits[0] : null;
  }, []);

  const handleMouseDown = (e) => {
    if (pendingTagLocal || state.pendingMeasurement) return;

    if (state.activeTool === "measure") {
      dispatch({ type: "SET_INTERACTING", payload: true });
    }

    const hit = getRaycastHit(e);
    if (!hit) return;

    if (state.activeTool === "measure") {
      const point = hit.point;
      dispatch({
        type: "SET_MEASURE_POINT_A",
        payload: [point.x, point.y, point.z],
      });
      if (controlsRef.current) controlsRef.current.enabled = false;
    }
  };

  const handleMouseMove = (e) => {
    if (
      state.activeTool !== "measure" ||
      !state.measurePointA ||
      state.pendingMeasurement
    )
      return;

    const hit = getRaycastHit(e);
    if (!hit) return;

    const scene = sceneRef.current;
    if (!scene) return;

    previewObjectsRef.current.forEach((obj) => scene.remove(obj));
    previewObjectsRef.current = [];

    const a = new THREE.Vector3(...state.measurePointA);
    const b = hit.point;
    const line = createDimLine(a, b, 0xffff00);
    const pinB = createDimPin(b, 0xffff00, 1.3);

    scene.add(line, pinB);
    previewObjectsRef.current = [line, pinB];
  };

  const handleMouseUp = (e) => {
    if (pendingTagLocal || state.pendingMeasurement) return;

    if (state.activeTool === "measure" && state.measurePointA) {
      dispatch({ type: "SET_INTERACTING", payload: false });
      const hit = getRaycastHit(e);
      const container = containerRef.current;

      const scene = sceneRef.current;
      if (scene) {
        previewObjectsRef.current.forEach((obj) => scene.remove(obj));
        previewObjectsRef.current = [];
      }

      if (hit && container) {
        const rect = container.getBoundingClientRect();
        dispatch({
          type: "SET_PENDING_MEASUREMENT",
          payload: {
            pointA: state.measurePointA,
            pointB: [hit.point.x, hit.point.y, hit.point.z],
            screenX: e.clientX - rect.left,
            screenY: e.clientY - rect.top,
          },
        });
      } else {
        dispatch({ type: "SET_MEASURE_POINT_A", payload: null });
        if (controlsRef.current) controlsRef.current.enabled = true;
      }
    }
  };

  const handleCanvasClick = useCallback(
    (e) => {
      if (pendingTagLocal || state.pendingMeasurement) return;
      const hit = getRaycastHit(e);
      if (!hit) return;

      const rect = containerRef.current.getBoundingClientRect();
      const point = hit.point;
      const hitMesh = hit.object instanceof THREE.Mesh ? hit.object : null;
      const meshName = hitMesh?.name || "";
      const tool = state.activeTool;

      if (tool === "select") {
        if (state.selectedMeshName === meshName) {
          dispatch({ type: "SET_SELECTED_MESH", payload: null });
        } else {
          dispatch({ type: "SET_SELECTED_MESH", payload: meshName || null });
        }
      } else if (tool === "tag") {
        setPendingTagLocal({
          screenX: e.clientX - rect.left,
          screenY: e.clientY - rect.top,
          worldPosition: [point.x, point.y, point.z],
          meshName: meshName || undefined,
        });
        controlsRef.current.enabled = false;
      } else if (tool === "paint") {
        if (hitMesh) {
          const mat = hitMesh.material;
          if (mat && "color" in mat) {
            mat.color.set(state.paintColour);
          }
        }
      }
    },
    [state, dispatch, pendingTagLocal, getRaycastHit],
  );

  const closeTagForm = useCallback(() => {
    setPendingTagLocal(null);
    if (controlsRef.current) controlsRef.current.enabled = true;
  }, []);

  const closeMeasureForm = useCallback(() => {
    dispatch({ type: "SET_PENDING_MEASUREMENT", payload: null });
    if (controlsRef.current) controlsRef.current.enabled = true;
  }, [dispatch]);

  // ─── Swap mouse pointer CSS based on active tool ────────────────────────────
  const cursorMap = {
    select: "default",
    tag: "crosshair",
    measure: "crosshair",
    paint: "cell",
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        cursor: cursorMap[state.activeTool] || "default",
      }}
      onClick={handleCanvasClick}
      onPointerDown={handleMouseDown}
      onPointerMove={handleMouseMove}
      onPointerUp={handleMouseUp}
    >
      {/* 
        The canvas receives all native pointer events directly so OrbitControls
        works perfectly (drag to rotate, wheel to zoom). Events bubble up to the
        parent div where our React tools intercept them.
      */}
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          position: "absolute",
          inset: 0,
          touchAction: "none",
        }}
      />

      {/* Loading overlay */}
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(14,14,18,0.85)",
            zIndex: 50,
          }}
        >
          <div
            style={{
              width: "24px",
              height: "24px",
              border: "2px solid rgba(255,255,255,0.1)",
              borderTopColor: "white",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              marginBottom: "12px",
            }}
          />
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              color: "#525252",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
            }}
          >
            Loading_Model...
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Error overlay */}
      {loadError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(14,14,18,0.85)",
            zIndex: 50,
          }}
        >
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              color: "#ffb4ab",
            }}
          >
            ⚠ {loadError}
          </p>
        </div>
      )}

      {/* Active tool hint */}
      {!loading && (
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            padding: "6px 16px",
            pointerEvents: "none",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "10px",
            color: "#a3a3a3",
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
            zIndex: 10,
          }}
        >
          {state.activeTool === "select" &&
            "SELECT — click mesh  ·  Scroll: zoom  ·  Right-drag: pan"}
          {state.activeTool === "tag" &&
            "TAG — click any surface to place label"}
          {state.activeTool === "measure" &&
            (state.measurePointA
              ? "Release to save dimension"
              : "Drag to measure distance")}
          {state.activeTool === "paint" && "PAINT — click mesh to apply colour"}
        </div>
      )}

      {/* HTML Tag Input Form Overlay */}
      {pendingTagLocal && (
        <TagForm
          screenX={pendingTagLocal.screenX}
          screenY={pendingTagLocal.screenY}
          worldPosition={pendingTagLocal.worldPosition}
          meshName={pendingTagLocal.meshName}
          onClose={closeTagForm}
        />
      )}

      {/* Dimension Selection Form */}
      {state.pendingMeasurement && (
        <MeasurementForm
          screenX={state.pendingMeasurement.screenX}
          screenY={state.pendingMeasurement.screenY}
          pointA={state.pendingMeasurement.pointA}
          pointB={state.pendingMeasurement.pointB}
          onClose={closeMeasureForm}
        />
      )}

      {/* Dimension Labels HTML */}
      {state.measurements.map((m) => {
        if (!cameraRef.current || !containerRef.current) return null;
        const mid = new THREE.Vector3(
          (m.pointA[0] + m.pointB[0]) / 2,
          (m.pointA[1] + m.pointB[1]) / 2,
          (m.pointA[2] + m.pointB[2]) / 2,
        );
        const proj = mid.clone().project(cameraRef.current);
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((proj.x + 1) / 2) * rect.width;
        const y = ((-proj.y + 1) / 2) * rect.height;
        if (proj.z > 1) return null;
        return (
          <div
            key={m.id}
            id={`dim-label-${m.id}`}
            className="tag-badge"
            style={{
              position: "absolute",
              left: x,
              top: y,
              pointerEvents: "none",
              zIndex: 5,
              "--tag-colour": "#ffff00",
            }}
          >
            <div className="tag-dot" style={{ background: "#ffff00" }} />
            <div className="tag-pill" style={{ background: "#ffff00" }}>
              <span className="tag-pill-text">{m.label}</span>
            </div>
          </div>
        );
      })}

      {/* Tag badges — rendered inside the container so left/top are relative to canvas */}
      <TagOverlay positions={tagPositions} />
    </div>
  );
}
