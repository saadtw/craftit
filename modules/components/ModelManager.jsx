"use client";

import React, { useState, useCallback } from "react";
import ModelViewerPreview from "./ModelViewerPreview";
import Editor3DWrapper from "./Editor3DWrapper";

/**
 * ModelManager
 *
 * The orchestrator for the "Preview-First, Edit-Conditionally" pipeline.
 * It holds a single boolean (isEditing) that switches the render between:
 *
 *   Preview Mode (default): lightweight <model-viewer> web component
 *   Editor Mode:            heavy Three.js EditorCanvas inside Editor3DWrapper
 *
 * Props:
 *   model3D       (object)  - The full model3D sub-document from MongoDB:
 *                             { url, filename, fileSize, annotations,
 *                               cameraState, dimensions }
 *   resourceId    (string)  - The _id of the parent resource (Product /
 *                             CustomOrder) that owns this model3D field.
 *   resourceType  (string)  - "product" | "customOrder" — tells the PATCH
 *                             endpoint which collection to update.
 *   canEdit       (boolean) - Whether the current user is allowed to open
 *                             the editor (e.g. manufacturer or order owner).
 *   viewerHeight  (string)  - Optional CSS height passed through to preview.
 *
 * Save flow:
 *   When the user clicks "SAVE_&_FINISH" inside the Toolbar, Toolbar calls
 *   the onSave prop of Editor3DWrapper. We intercept this here, pull the
 *   live annotation state from the AnnotationStore context (already wired
 *   inside Editor3DWrapper → AnnotationProvider), and PATCH the backend.
 *
 * Why not lift all state here?
 *   The AnnotationStore (context + reducer) lives *inside* Editor3DWrapper
 *   because it needs to be co-located with EditorCanvas for the shared
 *   sceneRef. We therefore receive the final state snapshot via the onSave
 *   callback that Toolbar already fires, rather than re-duplicating the
 *   context hierarchy here.
 */
export default function ModelManager({
  model3D,
  resourceId,
  resourceType = "product",
  canEdit = false,
  viewerHeight = "480px",
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // "success" | "error" | null

  // ── handleSaveMetadata ──────────────────────────────────────────────────────
  // Called by Toolbar's onSave prop with: (glbBlob, tags, cameraState)
  // We send the annotation metadata to the backend via PATCH.
  // The blob is intentionally NOT re-uploaded here — we are only persisting
  // the overlay metadata (tags, dimensions) that was added on top of the
  // already-stored GLB in S3.
  const handleSaveMetadata = useCallback(
    async (glbBlob, tags, cameraState) => {
      if (!resourceId) {
        console.warn("ModelManager: resourceId is required to save metadata.");
        return;
      }

      setIsSaving(true);
      setSaveStatus(null);

      try {
        const payload = {
          resourceId,
          resourceType,
          // Annotations are the Tag pins placed on the 3D surface
          annotations: tags || [],
          // cameraState captures the viewport orientation so it restores on
          // next view. Toolbar passes null here currently; wire up later.
          cameraState: cameraState || null,
        };

        const res = await fetch("/api/models/update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${res.status}`);
        }

        setSaveStatus("success");
        // Return to preview mode after a brief success flash
        setTimeout(() => {
          setIsEditing(false);
          setSaveStatus(null);
        }, 1500);
      } catch (err) {
        console.error("ModelManager: save failed:", err);
        setSaveStatus("error");
      } finally {
        setIsSaving(false);
      }
    },
    [resourceId, resourceType]
  );

  // ── handleCancelEdit ────────────────────────────────────────────────────────
  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveStatus(null);
  };

  // ── No model at all ─────────────────────────────────────────────────────────
  if (!model3D?.url) {
    return (
      <ModelViewerPreview modelUrl={null} height={viewerHeight} />
    );
  }

  return (
    <div style={styles.root}>
      {/* ── PREVIEW MODE ── */}
      {!isEditing && (
        <>
          <ModelViewerPreview
            modelUrl={model3D.url}
            height={viewerHeight}
          />

          {/* Edit button — only visible to authorised users */}
          {canEdit && (
            <div style={styles.actionRow}>
              <button
                id="openEditorBtn"
                style={styles.editBtn}
                onClick={() => setIsEditing(true)}
              >
                <span style={styles.btnIcon}>✏️</span>
                Edit / Annotate Model
              </button>
            </div>
          )}
        </>
      )}

      {/* ── EDITOR MODE ── */}
      {isEditing && (
        <>
          {/* Cancel bar sits above the editor so it's always reachable */}
          <div style={styles.editorHeader}>
            <span style={styles.editorLabel}>3D_EDITOR — Annotation Mode</span>
            <div style={styles.editorActions}>
              {/* Save status feedback */}
              {saveStatus === "success" && (
                <span style={styles.successBadge}>✓ Saved</span>
              )}
              {saveStatus === "error" && (
                <span style={styles.errorBadge}>✗ Save failed — try again</span>
              )}
              {isSaving && (
                <span style={styles.savingBadge}>Saving…</span>
              )}

              <button
                id="cancelEditBtn"
                style={styles.cancelBtn}
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                ✕ Cancel
              </button>
            </div>
          </div>

          {/*
           * Editor3DWrapper already composes:
           *   AnnotationProvider → EditorCanvas + Toolbar
           * We pass our handleSaveMetadata as the onSave prop so Toolbar's
           * "SAVE_&_FINISH" button funnels back through this component.
           */}
          <Editor3DWrapper
            modelUrl={model3D.url}
            initialAnnotations={model3D.annotations || []}
            initialCameraState={model3D.cameraState || null}
            onSave={handleSaveMetadata}
            readOnly={false}
          />
        </>
      )}
    </div>
  );
}

// ── Inline styles ──────────────────────────────────────────────────────────────
const styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "100%",
  },
  actionRow: {
    display: "flex",
    justifyContent: "flex-end",
  },
  editBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "9px 18px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "6px",
    color: "#e5e5e5",
    fontSize: "12px",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.15s, border-color 0.15s",
    letterSpacing: "0.01em",
  },
  btnIcon: {
    fontSize: "14px",
  },
  editorHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    background: "#0e0e12",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "6px 6px 0 0",
  },
  editorLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    color: "#525252",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
  },
  editorActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  cancelBtn: {
    padding: "6px 14px",
    background: "rgba(147,0,10,0.12)",
    border: "1px solid rgba(147,0,10,0.3)",
    borderRadius: "4px",
    color: "#ffb4ab",
    fontSize: "11px",
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.08em",
  },
  successBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    color: "#6ee7b7",
    letterSpacing: "0.08em",
  },
  errorBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    color: "#ffb4ab",
    letterSpacing: "0.08em",
  },
  savingBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    color: "#a3a3a3",
    letterSpacing: "0.08em",
  },
};
