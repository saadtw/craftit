// app/manufacturer/products/model-editor/page.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Editor3DWrapper from "@/modules/components/Editor3DWrapper";

const SESSION_KEY = "draftModel3D";

/**
 * DraftModelEditorPage
 *
 * A fully isolated, full-screen route for annotating a 3D model that
 * has been uploaded during product creation but whose product record
 * does not exist in the database yet.
 *
 * Data flow:
 *   /new page        →  sessionStorage.setItem(SESSION_KEY, JSON)  →  this page
 *   this page (save) →  sessionStorage.setItem(SESSION_KEY, JSON)  →  /new page
 *
 * sessionStorage is used (not localStorage) so data is scoped to the
 * browser tab and automatically cleared when the tab closes.
 */
export default function DraftModelEditorPage() {
  const router = useRouter();
  const { status } = useSession();

  // The parsed model3D draft object: { url, filename, fileSize, annotations?, cameraState? }
  const [draftModel, setDraftModel] = useState(null);
  // true = sessionStorage was checked and was empty → redirect pending
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // ── Read draft from sessionStorage on mount ────────────────────────────────
  useEffect(() => {
    // sessionStorage is only available in the browser
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      // No draft data — the user navigated here directly. Send them back.
      setShouldRedirect(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!parsed?.url) {
        setShouldRedirect(true);
        return;
      }
      setDraftModel(parsed);
    } catch {
      // Corrupted data — clean up and redirect
      sessionStorage.removeItem(SESSION_KEY);
      setShouldRedirect(true);
    }
  }, []);

  // Deferred redirect so the effect can finish before navigation
  useEffect(() => {
    if (shouldRedirect) {
      router.push("/manufacturer/products/new");
    }
  }, [shouldRedirect, router]);

  // ── onSave: called by Toolbar's "SAVE_&_FINISH" button ─────────────────────
  // Receives (gltfBlob, tags, cameraState) from Toolbar.handleSaveFinish.
  // The GLTFExporter always produces a gltfBlob of the full scene. We upload
  // it to S3 to replace the original, so any paint/mesh changes are persisted.
  const handleSave = async (gltfBlob, annotations, cameraState) => {
    setIsSaving(true);
    let finalUrl = draftModel.url;
    let finalSize = draftModel.fileSize;

    if (gltfBlob) {
      try {
        // Build a safe .glb filename — the backend validates the extension
        let safeName = draftModel.filename || "edited_model.glb";
        const lower = safeName.toLowerCase();
        if (!lower.endsWith(".glb") && !lower.endsWith(".gltf")) {
          const dot = safeName.lastIndexOf(".");
          safeName = (dot > -1 ? safeName.substring(0, dot) : safeName) + "_edited.glb";
        } else {
          const dot = safeName.lastIndexOf(".");
          safeName = safeName.substring(0, dot) + "_edited" + safeName.substring(dot);
        }

        const formData = new FormData();
        formData.append("type", "3d-model");
        formData.append("file", gltfBlob, safeName);

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();

        if (data.success && data.file?.url) {
          finalUrl = data.file.url;
          finalSize = gltfBlob.size;
        } else {
          console.error("[model-editor] Upload rejected:", data);
          // Fall back silently — the original model URL is still valid
        }
      } catch (err) {
        console.error("[model-editor] Upload error:", err);
        // Fall back silently — original URL is still intact
      }
    }

    const updated = {
      ...draftModel,
      url: finalUrl,
      fileSize: finalSize,
      annotations: annotations || [],
      cameraState: cameraState || null,
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    router.push("/manufacturer/products/new");
  };

  // ── handleCancel: discard edits, return without writing ───────────────────
  const handleCancel = () => {
    // Leave sessionStorage intact so the /new page can still restore the
    // original model URL and any previously saved annotations.
    router.push("/manufacturer/products/new");
  };

  // ── Loading states ─────────────────────────────────────────────────────────
  if (status === "loading" || (!draftModel && !shouldRedirect) || isSaving) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          gap: "16px",
        }}
      >
        <div style={styles.spinner} />
        {isSaving && (
          <p style={{ color: "#a3a3a3", fontFamily: "'Inter', sans-serif", fontSize: "14px" }}>
            Processing and uploading edited model...
          </p>
        )}
      </div>
    );
  }

  // shouldRedirect is handled by the useEffect — render nothing while navigating
  if (shouldRedirect || !draftModel) return null;

  // ── Full-screen editor ─────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <span style={styles.breadcrumb}>New Product</span>
          <span style={styles.breadcrumbSep}>›</span>
          <span style={styles.breadcrumbCurrent}>3D Model Editor</span>
        </div>

        <div style={styles.fileInfo}>
          <span style={styles.fileIcon}>📦</span>
          <span style={styles.fileName}>
            {draftModel.filename || "3D Model"}
          </span>
          {draftModel.fileSize && (
            <span style={styles.fileSize}>
              {(draftModel.fileSize / 1024 / 1024).toFixed(2)} MB
            </span>
          )}
        </div>

        <div style={styles.topBarRight}>
          <p style={styles.helpText}>
            Use the toolbar to add tags, measure, or paint the model.
            Click <strong style={{ color: "white" }}>SAVE_&amp;_FINISH</strong> in the sidebar when done.
          </p>
          <button
            id="cancelEditorBtn"
            onClick={handleCancel}
            style={styles.cancelBtn}
          >
            ✕ Cancel — back to form
          </button>
        </div>
      </div>

      {/* Editor canvas — takes all remaining height */}
      <div style={styles.editorContainer}>
        <Editor3DWrapper
          modelUrl={draftModel.url}
          initialAnnotations={draftModel.annotations || []}
          initialCameraState={draftModel.cameraState || null}
          onSave={handleSave}
          readOnly={false}
        />
      </div>
    </div>
  );
}

// ── Inline styles ─────────────────────────────────────────────────────────────
//
// Why calc(100vh - 56px)?
//   The manufacturer layout wraps every page with <ManufacturerNav>, a sticky
//   header that is ~56px tall. Using 100vh here would overflow the viewport
//   and produce a scrollbar that pushes the WebGL canvas out of view.
//
// Why minHeight: 0 on editorContainer?
//   In a flex column, children default to min-height: auto, which means they
//   won't shrink below their intrinsic size. Setting minHeight: 0 allows the
//   flex child to honour the parent's height constraint so the inner h-full
//   on Editor3DWrapper resolves correctly.
const styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 56px)",
    background: "#0a0a0a",
    overflow: "hidden",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 20px",
    background: "#0e0e0e",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    flexShrink: 0,
    gap: "16px",
    flexWrap: "wrap",
    zIndex: 10,
  },
  topBarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  breadcrumb: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    color: "#525252",
    letterSpacing: "0.08em",
  },
  breadcrumbSep: {
    color: "#333",
    fontSize: "12px",
  },
  breadcrumbCurrent: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    color: "#a3a3a3",
    letterSpacing: "0.08em",
  },
  fileInfo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  fileIcon: {
    fontSize: "14px",
  },
  fileName: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "11px",
    color: "white",
    fontWeight: 700,
    letterSpacing: "0.04em",
    maxWidth: "220px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  fileSize: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    color: "#525252",
    letterSpacing: "0.06em",
  },
  topBarRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  helpText: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "10px",
    color: "#525252",
    letterSpacing: "0.06em",
    margin: 0,
    maxWidth: "320px",
    lineHeight: "1.5",
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
    whiteSpace: "nowrap",
  },
  // flex:1 + minHeight:0 is the correct pattern for a flex child that must
  // fill remaining space AND allow its own children to use h-full / 100%.
  editorContainer: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    position: "relative",
  },
  spinner: {
    width: "24px",
    height: "24px",
    border: "2px solid rgba(255,255,255,0.08)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};

