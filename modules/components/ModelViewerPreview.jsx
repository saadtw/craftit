"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * ModelViewerPreview
 *
 * A lightweight read-only 3D model viewer backed by Google's <model-viewer>
 * web component. Supports rendering annotation hotspots (tags) as clickable
 * HTML overlays anchored to 3D world-space coordinates via <model-viewer>'s
 * slot="hotspot-*" mechanism.
 *
 * Why useEffect + script tag instead of an npm package?
 * The @google/model-viewer package is designed to self-register the
 * <model-viewer> custom element. Loading it as a side-effect CDN script
 * inside useEffect (client-only) is the safest SSR-compatible approach
 * for Next.js App Router, avoiding any hydration mismatch entirely.
 *
 * Why useRef for the <model-viewer> element?
 * React's JSX cannot natively pass children to custom elements in a way
 * that respects the Shadow DOM slot mechanism that <model-viewer> uses.
 * We imperatively create <button slot="hotspot-*"> children and append them
 * to the live DOM node via a ref, which is the correct pattern per the
 * model-viewer documentation.
 *
 * Props:
 *   modelUrl    (string)  - The S3 public URL of the .glb file
 *   annotations (array)   - Array of tag objects: { id, worldPosition: {x,y,z}, label, colour }
 *   height      (string)  - CSS height of the viewer, default "480px"
 *   poster      (string)  - Optional loading poster image URL
 */
export default function ModelViewerPreview({
  modelUrl,
  annotations = [],
  height = "480px",
  poster,
}) {
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const scriptRef = useRef(null);
  const viewerRef = useRef(null);

  // ── Inject <model-viewer> CDN script once on the client ───────────────────
  useEffect(() => {
    if (customElements.get("model-viewer")) {
      setScriptReady(true);
      return;
    }
    if (scriptRef.current) return;

    const script = document.createElement("script");
    script.type = "module";
    script.src =
      "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js";
    script.onload = () => setScriptReady(true);
    script.onerror = () => setScriptError(true);
    scriptRef.current = script;
    document.head.appendChild(script);
  }, []);

  // ── Inject hotspot buttons into the live <model-viewer> DOM node ──────────
  // <model-viewer> reads slot="hotspot-*" children as 3D-anchored overlays.
  // We imperatively manage them so React's virtual DOM doesn't interfere
  // with the custom element's internal Shadow DOM mechanics.
  useEffect(() => {
    const mv = viewerRef.current;
    if (!mv || !scriptReady) return;

    // Remove all existing hotspots before re-rendering
    const existing = mv.querySelectorAll("[slot^='hotspot-']");
    existing.forEach((el) => el.remove());

    if (!annotations || annotations.length === 0) return;

    annotations.forEach((anno) => {
      if (!anno?.worldPosition) return;
      const { x, y, z } = anno.worldPosition;

      // The outer <button> is the anchor; model-viewer positions it in 3D space
      const btn = document.createElement("button");
      btn.setAttribute("slot", `hotspot-${anno.id}`);
      btn.setAttribute("data-position", `${x} ${y} ${z}`);
      btn.setAttribute("data-normal", "0 1 0");
      btn.setAttribute("data-visibility-attribute", "visible");
      btn.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0;
        background: none;
        border: none;
        cursor: default;
        pointer-events: none;
      `;

      // The coloured dot — the visual anchor pinned to the 3D coordinate
      const dot = document.createElement("div");
      dot.style.cssText = `
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${anno.colour || "#6ee7f7"};
        border: 2px solid rgba(255,255,255,0.9);
        box-shadow: 0 0 6px ${anno.colour || "#6ee7f7"}, 0 2px 8px rgba(0,0,0,0.6);
        flex-shrink: 0;
      `;

      // The label pill
      const pill = document.createElement("div");
      pill.style.cssText = `
        background: rgba(10,10,10,0.85);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 4px;
        padding: 3px 8px;
        font-family: 'Inter', sans-serif;
        font-size: 11px;
        font-weight: 600;
        color: white;
        white-space: nowrap;
        backdrop-filter: blur(4px);
        max-width: 160px;
        overflow: hidden;
        text-overflow: ellipsis;
      `;
      pill.textContent = anno.label || "Tag";

      btn.appendChild(dot);
      btn.appendChild(pill);
      mv.appendChild(btn);
    });
  }, [scriptReady, annotations, modelUrl]);

  // ── No URL provided ────────────────────────────────────────────────────────
  if (!modelUrl) {
    return (
      <div style={styles.placeholder}>
        <span style={styles.placeholderIcon}>📦</span>
        <p style={styles.placeholderText}>No 3D model attached</p>
      </div>
    );
  }

  // ── CDN script failed to load ──────────────────────────────────────────────
  if (scriptError) {
    return (
      <div style={styles.placeholder}>
        <span style={styles.placeholderIcon}>⚠️</span>
        <p style={styles.placeholderText}>
          Failed to load 3D viewer. Check your internet connection.
        </p>
      </div>
    );
  }

  // ── Script still loading ───────────────────────────────────────────────────
  if (!scriptReady) {
    return (
      <div style={{ ...styles.placeholder, height }}>
        <div style={styles.spinner} />
        <p style={styles.spinnerText}>Initialising viewer...</p>
      </div>
    );
  }

  // ── model-viewer is ready ──────────────────────────────────────────────────
  // We render the custom element via createElement so we can attach the ref.
  // Hotspot children are injected imperatively by the useEffect above.
  // Note: This ref is for a native custom element (web component), not a function component.
  // eslint-disable-next-line react-hooks/refs -- ref targets a DOM custom element, not a React child function
  return React.createElement("model-viewer", {
    ref: viewerRef,
    src: modelUrl,
    poster: poster || undefined,
    alt: "3D model preview",
    "camera-controls": true,
    "auto-rotate": true,
    "auto-rotate-delay": "2000",
    "rotation-per-second": "20deg",
    "shadow-intensity": "1",
    "environment-image": "neutral",
    exposure: "0.85",
    style: {
      width: "100%",
      height,
      background: "#0e0e12",
      borderRadius: "8px",
      "--hotspot-opacity": "1", // ensure hotspots are always visible
    },
  });
}

// ── Inline styles (no Tailwind dependency) ─────────────────────────────────
const styles = {
  placeholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "480px",
    background: "#0e0e12",
    borderRadius: "8px",
    border: "1px dashed rgba(255,255,255,0.1)",
    gap: "12px",
  },
  placeholderIcon: {
    fontSize: "32px",
  },
  placeholderText: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    color: "#525252",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    margin: 0,
  },
  spinner: {
    width: "24px",
    height: "24px",
    border: "2px solid rgba(255,255,255,0.08)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "mv-spin 0.8s linear infinite",
  },
  spinnerText: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    color: "#525252",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    margin: 0,
  },
};
