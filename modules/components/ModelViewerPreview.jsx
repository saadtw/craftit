"use client";

import React, { useEffect, useRef, useState } from "react";

// Global singleton for model-viewer script injection
let modelViewerPromise = null;

/**
 * ModelViewerPreview
 *
 * Props:
 *   modelUrl      (string)  - The public URL of the .glb file
 *   annotations   (array)   - Array of tag objects: { id, worldPosition: {x,y,z}, label, colour }
 *   height        (string)  - CSS height of the viewer, default "480px"
 *   poster        (string)  - Optional loading poster image URL
 *   fileSizeBytes (number)  - Optional size in bytes to trigger large file handling
 */
export default function ModelViewerPreview({
  modelUrl,
  annotations = [],
  measurements = [],
  height = "480px",
  poster,
  fileSizeBytes = 0,
}) {
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState(false);
  const [timeoutWarning, setTimeoutWarning] = useState(false);
  const [key, setKey] = useState(0); // for retry force-render
  const [showAnnotations, setShowAnnotations] = useState(true);
  
  const viewerRef = useRef(null);

  // ── Validate URL ──────────────────────────────────────────────────────────
  const isValidUrl = () => {
    if (!modelUrl) return false;
    if (modelUrl.startsWith("blob:")) return true;
    try {
      const url = new URL(modelUrl);
      return url.protocol === "https:" || url.hostname === "localhost" || url.hostname === "127.0.0.1";
    } catch {
      return false;
    }
  };

  const isLargeFile = fileSizeBytes > 30 * 1024 * 1024; // >30MB

  // ── Inject <model-viewer> CDN script globally ──────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (customElements.get("model-viewer")) {
      setScriptReady(true);
      return;
    }

    if (!modelViewerPromise) {
      modelViewerPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.type = "module";
        script.src = "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    modelViewerPromise
      .then(() => setScriptReady(true))
      .catch(() => setScriptError(true));
  }, []);

  // ── Handle Viewer Load / Error / Timeout ──────────────────────────────────
  useEffect(() => {
    const mv = viewerRef.current;
    if (!mv || !scriptReady || !isValidUrl()) return;

    const handleLoad = () => {
      setModelLoading(false);
      setTimeoutWarning(false);
    };

    const handleError = () => {
      setModelError(true);
      setModelLoading(false);
    };

    mv.addEventListener("load", handleLoad);
    mv.addEventListener("error", handleError);

    // 30 second timeout for large files or slow connections
    const timer = setTimeout(() => {
      if (modelLoading && !modelError) {
        setTimeoutWarning(true);
      }
    }, 30000);

    return () => {
      clearTimeout(timer);
      mv.removeEventListener("load", handleLoad);
      mv.removeEventListener("error", handleError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady, key, modelLoading, modelError, modelUrl]);

  // ── Memory Management Cleanup ─────────────────────────────────────────────
  useEffect(() => {
    const mv = viewerRef.current;
    return () => {
      if (mv) {
        // Clear src to signal GPU memory release
        mv.src = '';
        // Remove hotspot children
        const existing = mv.querySelectorAll("[slot^='hotspot-']");
        existing.forEach((el) => el.remove());
      }
    };
  }, [modelUrl]);

  // ── Inject hotspot buttons into the live DOM ──────────────────────────────
  useEffect(() => {
    const mv = viewerRef.current;
    if (!mv || !scriptReady || modelLoading || modelError) return;

    const existing = mv.querySelectorAll("[slot^='hotspot-']");
    existing.forEach((el) => el.remove());

    if (!showAnnotations) return;

    if (annotations && annotations.length > 0) {
      annotations.forEach((anno) => {
      if (!anno?.worldPosition) return;
      let x, y, z;
      if (Array.isArray(anno.worldPosition)) {
         [x,y,z] = anno.worldPosition;
      } else {
         ({ x, y, z } = anno.worldPosition);
      }

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
    }

    if (!measurements || measurements.length === 0) return;

    measurements.forEach((m) => {
      if (!m.pointA || !m.pointB) return;
      
      let ax, ay, az, bx, by, bz;
      if (Array.isArray(m.pointA)) {
        [ax, ay, az] = m.pointA;
        [bx, by, bz] = m.pointB;
      } else {
        ({ x: ax, y: ay, z: az } = m.pointA);
        ({ x: bx, y: by, z: bz } = m.pointB);
      }

      // Dot A
      const dotA = document.createElement("button");
      dotA.setAttribute("slot", `hotspot-dim-${m.id}-A`);
      dotA.setAttribute("data-position", `${ax} ${ay} ${az}`);
      dotA.setAttribute("data-visibility-attribute", "visible");
      dotA.style.cssText = `background: none; border: none; padding: 0; pointer-events: none; display: flex; align-items: center; justify-content: center;`;
      const dotAInner = document.createElement("div");
      dotAInner.style.cssText = `width: 8px; height: 8px; border-radius: 50%; background: #ffff00; box-shadow: 0 0 4px #ffff00, 0 1px 4px rgba(0,0,0,0.8);`;
      dotA.appendChild(dotAInner);
      mv.appendChild(dotA);

      // Dot B
      const dotB = document.createElement("button");
      dotB.setAttribute("slot", `hotspot-dim-${m.id}-B`);
      dotB.setAttribute("data-position", `${bx} ${by} ${bz}`);
      dotB.setAttribute("data-visibility-attribute", "visible");
      dotB.style.cssText = `background: none; border: none; padding: 0; pointer-events: none; display: flex; align-items: center; justify-content: center;`;
      const dotBInner = document.createElement("div");
      dotBInner.style.cssText = `width: 8px; height: 8px; border-radius: 50%; background: #ffff00; box-shadow: 0 0 4px #ffff00, 0 1px 4px rgba(0,0,0,0.8);`;
      dotB.appendChild(dotBInner);
      mv.appendChild(dotB);

      // Label at Midpoint
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      const mz = (az + bz) / 2;

      const labelBtn = document.createElement("button");
      labelBtn.setAttribute("slot", `hotspot-dim-${m.id}-label`);
      labelBtn.setAttribute("data-position", `${mx} ${my} ${mz}`);
      labelBtn.setAttribute("data-visibility-attribute", "visible");
      labelBtn.style.cssText = `background: none; border: none; padding: 0; pointer-events: none; display: flex; align-items: center; justify-content: center;`;
      
      const pill = document.createElement("div");
      pill.style.cssText = `
        background: rgba(10,10,10,0.85);
        border: 1px solid #ffff00;
        border-radius: 4px;
        padding: 2px 6px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        font-weight: 700;
        color: #ffff00;
        white-space: nowrap;
        backdrop-filter: blur(4px);
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
      `;
      pill.textContent = m.label || "Dim";
      labelBtn.appendChild(pill);
      mv.appendChild(labelBtn);
    });
  }, [scriptReady, annotations, measurements, modelLoading, modelError, showAnnotations]);

  if (!isValidUrl()) {
    return (
      <div style={{ ...styles.placeholder, height }}>
        <span style={styles.placeholderIcon}>📦</span>
        <p style={styles.placeholderText}>{modelUrl ? "Invalid model URL" : "No 3D model attached"}</p>
      </div>
    );
  }

  if (scriptError || modelError) {
    return (
      <div style={{ ...styles.placeholder, height }}>
        <span style={styles.placeholderIcon}>⚠️</span>
        <p style={styles.placeholderText}>
          {modelError ? "Unable to load 3D model" : "Failed to load 3D viewer. Check your internet connection."}
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      {(!scriptReady || modelLoading) && (
        <div style={{ ...styles.placeholder, position: "absolute", inset: 0, zIndex: 10 }}>
          {poster ? (
             // eslint-disable-next-line @next/next/no-img-element -- supports blob/local poster URLs for staged model previews.
             <img src={poster} alt="Model Loading" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5, position: 'absolute' }} />
          ) : (
            <div style={styles.spinner} />
          )}
          <div style={{ zIndex: 11, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <p style={styles.spinnerText}>Loading 3D Model...</p>
            {isLargeFile && (
              <p style={{ ...styles.spinnerText, color: '#eb9728' }}>Large model — may take a moment to load</p>
            )}
            {timeoutWarning && (
              <div style={{ textAlign: "center", marginTop: "12px" }}>
                <p style={{ ...styles.spinnerText, color: '#ffb4ab', marginBottom: '8px' }}>Taking longer than expected.</p>
                <button
                  onClick={() => {
                    setKey(k => k + 1);
                    setModelLoading(true);
                    setTimeoutWarning(false);
                  }}
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontFamily: "'Inter', sans-serif" }}
                >
                  Retry Loading
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {scriptReady && React.createElement("model-viewer", {
        key,
        ref: viewerRef,
        src: modelUrl,
        poster: poster || undefined,
        alt: "3D model preview",
        crossorigin: "anonymous",
        loading: isLargeFile ? "eager" : "lazy",
        reveal: "auto",
        "camera-controls": true,
        "auto-rotate": true,
        "auto-rotate-delay": "2000",
        "rotation-per-second": "20deg",
        "shadow-intensity": "1",
        "environment-image": "neutral",
        exposure: "0.85",
        style: {
          width: "100%",
          height: "100%",
          background: "#0e0e12",
          borderRadius: "8px",
          "--hotspot-opacity": "1",
          opacity: modelLoading ? 0 : 1,
          transition: "opacity 0.3s ease",
        },
      })}
      
      {scriptReady && !modelLoading && !modelError && (annotations?.length > 0 || measurements?.length > 0) && (
        <button
          onClick={() => setShowAnnotations(p => !p)}
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            zIndex: 20,
            background: 'rgba(10,10,10,0.85)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px',
            padding: '6px 12px',
            color: 'white',
            fontFamily: "'Inter', sans-serif",
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(10,10,10,0.85)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
          }}
        >
          {showAnnotations ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Hide Annotations
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              Show Annotations
            </>
          )}
        </button>
      )}
    </div>
  );
}

const styles = {
  placeholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    background: "#0e0e12",
    borderRadius: "8px",
    border: "1px dashed rgba(255,255,255,0.1)",
    gap: "12px",
    overflow: "hidden",
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
    zIndex: 11,
  },
  spinner: {
    width: "24px",
    height: "24px",
    border: "2px solid rgba(255,255,255,0.08)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "mv-spin 0.8s linear infinite",
    zIndex: 11,
  },
  spinnerText: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    color: "#a3a3a3",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    margin: 0,
    zIndex: 11,
  },
};
