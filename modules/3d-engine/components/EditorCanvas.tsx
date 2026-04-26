'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useAnnotations } from './AnnotationStore';
import TagOverlay from './TagOverlay';
import TagForm from './TagForm';
import MeasurementForm from './MeasurementForm';
import type { Measurement, PendingTag, PendingMeasurement } from './types';
import { SCALE_FACTORS } from './types';

interface Props {
  modelUrl: string;
}

// ─── Dimension Line Helpers ───────────────────────────────────────────────────

/**
 * Helper to draw a solid 3D line between two Vector3 points.
 * Used for drawing distance measurement lines between Point A and Point B.
 */
function createDimLine(
  a: THREE.Vector3,
  b: THREE.Vector3,
  color = 0xffffff
): THREE.Line {
  // BufferGeometry is highly optimized for performance
  const geometry = new THREE.BufferGeometry().setFromPoints([a, b]);
  const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
  return new THREE.Line(geometry, material);
}

/**
 * Helper to create a 3D pin to indicate measurement endpoints.
 * Styled to look like a classic "map pointer" symbol.
 */
function createDimPin(pos: THREE.Vector3, color = 0xffffff, scale = 1.0): THREE.Group {
  const group = new THREE.Group();
  
  const radius = 0.04;
  const height = 0.15;
  
  // High-poly head with Phong shading for a premium rounded look
  const headGeo = new THREE.SphereGeometry(radius, 16, 16);
  const headMat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.4 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, height, 0); // Nest the sphere perfectly at the wide base of the cone
  
  // The tapering body connecting to the exact coordinate
  const bodyGeo = new THREE.ConeGeometry(radius * 0.95, height, 16);
  const bodyMat = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.4 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.x = Math.PI; // Point tip down
  body.position.set(0, height / 2, 0); // Shift tip up to 0,0,0
  
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
export default function EditorCanvas({ modelUrl }: Props) {
  // Subscribe to the global editor state (Context/Reducer)
  const { state, dispatch, sceneRef: globalSceneRef } = useAnnotations();

  // DOM Layout Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // === Three.js Object Refs ===
  // We use `useRef` wildly here because Three.js objects are mutable deeply-nested classes
  // that do NOT play well with React's immutable state paradigm. We want to update them
  // outside the React render cycle for performance.
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null); // The loaded model
  
  // Math utilities kept outside of loop to avoid GC pausing
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());
  const animFrameRef = useRef<number>(0);

  // === Measurement & Overlay Refs ===
  // We keep track of individual 3D objects added to the scene so we can clean them up later
  const dimLinesRef = useRef<Map<string, THREE.Object3D[]>>(new Map()); // Key is Measurement ID
  const pointASphereRef = useRef<THREE.Mesh | null>(null); // The "first click" of a measurement
  const previewObjectsRef = useRef<THREE.Object3D[]>([]); // Current drag-preview objects
  const gridRef = useRef<THREE.GridHelper | null>(null); // The floor grid

  // === React State ===
  // This state holds the computed [X,Y] screen CSS positions for floating HTML Tags.
  // We sync this from the Three.js 60fps loop back to React state.
  const [tagPositions, setTagPositions] = useState<
    Map<string, { x: number; y: number; visible: boolean }>
  >(new Map());

  // ─── Loading / Error state ───
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ─── Pending tag form ───
  // Holds data for a tag the user *just* clicked to create, but hasn't typed the text for yet
  const [pendingTagLocal, setPendingTagLocal] = useState<PendingTag | null>(null);

  // ─────────────────────────────── Scene Init ───────────────────────────────
  /**
   * Main Initialization Effect.
   * Boots up the entire WebGL environment.
   */
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;

    // --- Core Scene ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e0e12); // Restored dark monolith background
    sceneRef.current = scene;
    if (globalSceneRef) globalSceneRef.current = scene;

    // --- Grid Floor ---
    // Helpful visual reference for scale and rotation
    const grid = new THREE.GridHelper(20, 40, 0x333355, 0x222233);
    gridRef.current = grid;
    // Initial state based on current showGrid value
    grid.visible = state.showGrid !== false; 
    scene.add(grid);

    // --- Camera ---
    // Use getBoundingClientRect for accurate pixel size (clientWidth can be 0 during SSR/mount)
    const { width: initW, height: initH } = container.getBoundingClientRect();
    const camera = new THREE.PerspectiveCamera(
      55, // Field of View
      initW / initH || 1,
      0.01,
      2000
    );
    camera.position.set(0, 2, 6);
    cameraRef.current = camera;

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(initW, initH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // --- Lighting Array ---
    // 1. Ambient: Flat base light
    const ambient = new THREE.AmbientLight(0xffffff, 1.2); // Brighter ambient
    scene.add(ambient);

    // 2. Main Directional: Casts shadows, acts like the sun
    const dir = new THREE.DirectionalLight(0xffffff, 2.5); // Brighter directional
    dir.position.set(8, 12, 8);
    dir.castShadow = true;
    scene.add(dir);

    // 3. Fill Light: Soft blue light from opposite angle to soften dark shadows
    const fill = new THREE.DirectionalLight(0x8899ff, 0.3);
    fill.position.set(-5, 3, -5);
    scene.add(fill);

    // --- Orbital Camera Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Gives a weighty/smooth feel to spinning the camera
    controls.dampingFactor = 0.08;
    
    // Enable Cartesian Panning (Strafe) 
    controls.enablePan = true;
    controls.listenToKeyEvents(window); // Allow Arrow Keys to Pan
    controls.keyPanSpeed = 15.0; // Increase pan speed for better usability
    
    controlsRef.current = controls;

    // Trigger UI hiding when aggressively spinning the model
    controls.addEventListener('start', () => dispatch({ type: 'SET_INTERACTING', payload: true }));
    controls.addEventListener('end', () => dispatch({ type: 'SET_INTERACTING', payload: false }));

    // --- Model Loading ---
    const loader = new GLTFLoader();
    setLoading(true);
    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;
        modelGroupRef.current = model;

        // Auto-Center and Auto-Scale the camera based on model size
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Calculate the minimum distance to fit the model fully in view
        const fov = camera.fov * (Math.PI / 180);
        const dist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.2; // 1.2× = tight, focused fit

        camera.position.set(center.x, center.y + maxDim * 0.3, center.z + dist);
        camera.lookAt(center);
        camera.updateProjectionMatrix();
        controls.target.copy(center);

        // Shift geometric center to 0,0,0
        model.position.sub(center);

        // Prepare Meshes
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // Tell every polygon block to interact with shadows
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Sneakily store the original diffuse color into the object
            // so we can restore it if the user removes custom Paint colors.
            if (child.material && 'color' in child.material) {
              (child as THREE.Mesh & { _origColor?: THREE.Color })._origColor =
                (child.material as THREE.MeshStandardMaterial).color.clone();
            }
          }
        });

        scene.add(model);
        setLoading(false);
      },
      undefined,
      (err) => {
        console.error('Model load error:', err);
        setLoadError('Failed to load model.');
        setLoading(false);
      }
    );

    // ─── Animation loop (The Engine) ───
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      
      // Update camera physics
      controls.update();
      // Draw frame
      renderer.render(scene, camera);

      // --- Project 3D Tag Coordinates to 2D Screen Space ---
      // We do this every single frame so that HTML tags perfectly stick to the model as it spins
      if (cameraRef.current && containerRef.current) {
        const cam = cameraRef.current;
        const rect = container.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        const newMap = new Map<string, { x: number; y: number; visible: boolean }>();

        // Loop through all tags the user has made via our stable ref duplicate
        tagsSnapshotRef.current.forEach((tag) => {
          const wp = new THREE.Vector3(...tag.worldPosition);
          
          // .project(camera) does the complex math of converting a 3D point into 
          // a normalized 2D coordinate (-1 to +1 range)
          const proj = wp.clone().project(cam);
          
          // Convert the [-1, 1] range into absolute CSS pixel positions
          const x = ((proj.x + 1) / 2) * w;
          const y = ((-proj.y + 1) / 2) * h;
          
          // If the 'z' value is > 1 or < -1, the point is technically *behind* the camera
          // or past the far clip plane. We flag to hide those HTML elements.
          const visible = proj.z < 1 && proj.z > -1;
          
          newMap.set(tag.id, { x, y, visible });
        });
        
        // Push the calculated pixel values up into React State to move the actual DOM elements
        setTagPositions(newMap);
      }
    };
    animate();

    // ─── Resize Handler ───
    const onResize = () => {
      if (!containerRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ─── Disassembly / Cleanup ───
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      controls.dispose();
      scene.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl]); // Re-run all of this if the loaded Model URL changes

  // ─── Maintain a React-Ref duplicate of Reducer state ───────────────────
  // Because our animation loop runs completely independent of React renders,
  // it needs a stable reference to look up the current list of tags.
  // Using a ref here ensures the animate loop always sees the latest State data
  // without triggering a full engine restart on every state change.
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

    // 1. Remove deleted measurements from the 3D scene
    existing.forEach((objs, id) => {
      if (!state.measurements.find((m) => m.id === id)) {
        // Find it in scene, rip it out
        objs.forEach((o) => scene.remove(o));
        existing.delete(id);
      }
    });

    // 2. Add newly created measurements into the 3D scene
    state.measurements.forEach((m) => {
      // Only do this if we haven't already drawn it
      if (!existing.has(m.id)) {
        const a = new THREE.Vector3(...m.pointA);
        const b = new THREE.Vector3(...m.pointB);
        
        const line = createDimLine(a, b);
        // Use smaller pins for set dimensions
        const pA = createDimPin(a, 0xffffff, 0.4);
        const pB = createDimPin(b, 0xffffff, 0.4);
        
        scene.add(line, pA, pB);
        // Track the created THREE objects against the Measurement ID so we can clean them up later
        existing.set(m.id, [line, pA, pB]);
      }
    });
  }, [state.measurements]);

  // ─── React Effect: Render the "Point A" preview sphere ─────────────────────
  // When a user is in the middle of a 2-click measurement, we want to visually mark
  // their first click with a yellow dot so they know where they are drawing from.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear old sphere
    if (pointASphereRef.current) {
      scene.remove(pointASphereRef.current);
      pointASphereRef.current = null;
    }
    
    // Create new pin if PointA exists in state
    if (state.measurePointA) {
      const pin = createDimPin(
        new THREE.Vector3(...state.measurePointA),
        0xaaaaaa, // Light gray color for first click point
        0.8       // Medium scale
      );
      scene.add(pin);
      pointASphereRef.current = pin as any;
    }
  }, [state.measurePointA]);

  // ─── React Effect: Handle Mesh Highlighting (Select & Paint Tools) ──────────
  useEffect(() => {
    const model = modelGroupRef.current;
    if (!model) return;

    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const mat = child.material as THREE.MeshStandardMaterial;
      
      // Look up if the user has pinned properties/notes to this specific mesh name
      const mark = state.componentMarks[child.name];

      if (state.selectedMeshName === child.name) {
        // Highlight active clicked mesh in bright white/gray
        mat.emissive = new THREE.Color(0xffffff);
        mat.emissiveIntensity = 0.15;
      } else if (mark) {
        // Highlight globally marked meshes with their requested custom color
        mat.emissive = new THREE.Color(mark.highlightColour);
        mat.emissiveIntensity = 0.2;
      } else {
        // Default state: No glowing emission
        mat.emissive = new THREE.Color(0x000000);
        mat.emissiveIntensity = 0;
      }
    });
  }, [state.selectedMeshName, state.componentMarks]);

  // ─── Event Handlers for Tools ───────────────────────────────────────────────
  
  // Shared raycasting logic
  const getRaycastHit = useCallback((e: React.MouseEvent | MouseEvent) => {
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (pendingTagLocal || state.pendingMeasurement) return;

    if (state.activeTool === 'measure') {
      dispatch({ type: 'SET_INTERACTING', payload: true });
    }

    const hit = getRaycastHit(e);
    if (!hit) return;

    if (state.activeTool === 'measure') {
      const point = hit.point;
      dispatch({ type: 'SET_MEASURE_POINT_A', payload: [point.x, point.y, point.z] });
      // Temporarily disable orbit controls so we can drag the line
      if (controlsRef.current) controlsRef.current.enabled = false;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (state.activeTool !== 'measure' || !state.measurePointA || state.pendingMeasurement) return;

    const hit = getRaycastHit(e);
    if (!hit) return;

    const scene = sceneRef.current;
    if (!scene) return;

    // Clear previous preview
    previewObjectsRef.current.forEach(obj => scene.remove(obj));
    previewObjectsRef.current = [];

    // Create new preview
    const a = new THREE.Vector3(...state.measurePointA);
    const b = hit.point;
    const line = createDimLine(a, b, 0xffff00); // Yellow preview line
    // Use a large pointer symbol when the user is actively dragging/pointing
    const pinB = createDimPin(b, 0xffff00, 1.3);
    
    scene.add(line, pinB);
    previewObjectsRef.current = [line, pinB];
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (pendingTagLocal || state.pendingMeasurement) return;

    if (state.activeTool === 'measure' && state.measurePointA) {
      dispatch({ type: 'SET_INTERACTING', payload: false });
      const hit = getRaycastHit(e);
      const container = containerRef.current;
      
      // Clear preview from scene regardless of hit
      const scene = sceneRef.current;
      if (scene) {
        previewObjectsRef.current.forEach(obj => scene.remove(obj));
        previewObjectsRef.current = [];
      }

      if (hit && container) {
        const rect = container.getBoundingClientRect();
        dispatch({ 
          type: 'SET_PENDING_MEASUREMENT', 
          payload: {
            pointA: state.measurePointA,
            pointB: [hit.point.x, hit.point.y, hit.point.z],
            screenX: e.clientX - rect.left,
            screenY: e.clientY - rect.top,
          } 
        });
      } else {
        // Reset if we missed the model on release
        dispatch({ type: 'SET_MEASURE_POINT_A', payload: null });
        if (controlsRef.current) controlsRef.current.enabled = true;
      }
    }
  };

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // If the Tag Popup Form is open, block interactions with the 3D model behind it
      if (pendingTagLocal || state.pendingMeasurement) return; 
      
      const hit = getRaycastHit(e);
      if (!hit) return;

      const rect = containerRef.current!.getBoundingClientRect();
      const point = hit.point;
      const hitMesh = hit.object instanceof THREE.Mesh ? hit.object : null;
      const meshName = hitMesh?.name || '';

      const tool = state.activeTool;

      if (tool === 'select') {
        if (state.selectedMeshName === meshName) {
          dispatch({ type: 'SET_SELECTED_MESH', payload: null });
        } else {
          dispatch({ type: 'SET_SELECTED_MESH', payload: meshName || null });
        }
      } else if (tool === 'tag') {
        setPendingTagLocal({
          screenX: e.clientX - rect.left,
          screenY: e.clientY - rect.top,
          worldPosition: [point.x, point.y, point.z],
          meshName: meshName || undefined,
        });
        controlsRef.current!.enabled = false;
      } else if (tool === 'paint') {
        if (hitMesh) {
          const mat = hitMesh.material as THREE.MeshStandardMaterial;
          if (mat && 'color' in mat) {
            mat.color.set(state.paintColour);
          }
        }
      }
    },
    [state, dispatch, pendingTagLocal, getRaycastHit]
  );

  /**
   * Called when user saves or cancels the Tag Popup Form.
   * Clears the pending tag data and unlocks the 3D camera.
   */
  const closeTagForm = useCallback(() => {
    setPendingTagLocal(null);
    if (controlsRef.current) controlsRef.current.enabled = true;
  }, []);

  /**
   * Called when user saves or cancels the Measurement Overlay Form.
   */
  const closeMeasureForm = useCallback(() => {
    dispatch({ type: 'SET_PENDING_MEASUREMENT', payload: null });
    if (controlsRef.current) controlsRef.current.enabled = true;
  }, [dispatch]);

  // ─── Swap mouse pointer CSS based on active tool ────────────────────────────
  const cursorMap: Record<string, string> = {
    select: 'default',
    tag: 'crosshair',
    measure: 'crosshair',
    paint: 'cell',
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Three.js canvas fills the center panel */}
        <div
          ref={containerRef}
          style={{
            position: 'absolute', inset: 0,
            cursor: cursorMap[state.activeTool] || 'default',
          }}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

          {/* Loading overlay */}
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', background: 'rgba(14,14,18,0.85)',
            }}>
              <div style={{
                width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.1)',
                borderTopColor: 'white', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', marginBottom: '12px',
              }} />
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#525252', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Loading_Model...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Error overlay */}
          {loadError && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(14,14,18,0.85)',
            }}>
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#ffb4ab' }}>⚠ {loadError}</p>
            </div>
          )}

          {/* Active tool hint — bottom center */}
          {!loading && (
            <div style={{
              position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px',
              padding: '6px 16px', pointerEvents: 'none',
              fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
              color: '#a3a3a3', letterSpacing: '0.06em', whiteSpace: 'nowrap',
            }}>
              {state.activeTool === 'select' && 'SELECT — click mesh  ·  Pan: right-click or arrows'}
              {state.activeTool === 'tag' && 'TAG — click any surface to place label'}
              {state.activeTool === 'measure' && (state.measurePointA ? 'Release to save dimension' : 'Drag to measure distance')}
              {state.activeTool === 'paint' && 'PAINT — click mesh to apply colour'}
            </div>
          )}

          {/* HTML Tag Input Form Overlay - Appears exactly where user clicked */}
          {pendingTagLocal && (
            <TagForm
              screenX={pendingTagLocal.screenX}
              screenY={pendingTagLocal.screenY}
              worldPosition={pendingTagLocal.worldPosition}
              meshName={pendingTagLocal.meshName}
              onClose={closeTagForm}
            />
          )}

          {/* Dimension Selection Form - Appears after dragging */}
          {state.pendingMeasurement && (
            <MeasurementForm
              screenX={state.pendingMeasurement.screenX}
              screenY={state.pendingMeasurement.screenY}
              pointA={state.pendingMeasurement.pointA}
              pointB={state.pendingMeasurement.pointB}
              onClose={closeMeasureForm}
            />
          )}

          {/* 
            Dimension Labels HTML
            For every distance line, we calculate the exact midpoint in 3D space,
            project it back to 2D CSS space, and render the text readout here.
          */}
          {state.measurements.map((m) => {
            if (!cameraRef.current || !containerRef.current) return null;
            
            // Find 3D midpoint between A and B
            const mid = new THREE.Vector3(
              (m.pointA[0] + m.pointB[0]) / 2,
              (m.pointA[1] + m.pointB[1]) / 2,
              (m.pointA[2] + m.pointB[2]) / 2
            );
            
            // Math to convert to 2D screen coord
            const proj = mid.clone().project(cameraRef.current);
            const rect = containerRef.current.getBoundingClientRect();
            const x = ((proj.x + 1) / 2) * rect.width;
            const y = ((-proj.y + 1) / 2) * rect.height;
            
            // Hide label if the 3D midpoint goes behind the camera mathematically
            if (proj.z > 1) return null;
            
            return (
              <div
                key={m.id}
                id={`dim-label-${m.id}`}
                className="dim-label"
                style={{ left: x, top: y }}
              >
                {m.label}
              </div>
            );
          })}
        </div>

      {/* Render the saved, completed floating HTML Tags */}
      <TagOverlay positions={tagPositions} />
    </div>
  );
}
