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
      // We intentionally set state here to trigger the deferred redirect effect below.
      // This pattern is safe and is the recommended approach for conditional redirects.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShouldRedirect(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!parsed?.url) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShouldRedirect(true);
        return;
      }
      setDraftModel(parsed);
    } catch {
      // Corrupted data — clean up and redirect
      sessionStorage.removeItem(SESSION_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
  const handleSave = async (gltfBlob, annotations, cameraState, snapshotBlob) => {
    setIsSaving(true);
    let finalUrl = draftModel.url;
    let finalSize = draftModel.fileSize;
    let finalThumbnailUrl = draftModel.thumbnailUrl || null;

    if (gltfBlob) {
      try {
        const timestamp = Date.now();

        // 1. Upload the new edited model to S3
        let safeName = draftModel.filename || "edited_model.glb";
        const lower = safeName.toLowerCase();
        if (!lower.endsWith(".glb") && !lower.endsWith(".gltf")) {
          const dot = safeName.lastIndexOf(".");
          safeName =
            (dot > -1 ? safeName.substring(0, dot) : safeName) + "_edited.glb";
        } else {
          const dot = safeName.lastIndexOf(".");
safeName = safeName.substring(0, dot) + `_${timestamp}` + safeName.substring(dot);
}

        const formData = new FormData();
        formData.append("type", "3d-model");
        formData.append("file", gltfBlob, safeName);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (data.success && data.file?.url) {
          finalUrl = data.file.url;
          finalSize = gltfBlob.size;
        } else {
          console.error("[model-editor] Upload rejected:", data);
        }

        // 2. Upload the snapshot image (if captured)
        if (snapshotBlob) {
          const snapshotFile = new File([snapshotBlob], `snapshot_${timestamp}.png`, {
            type: "image/png",
          });
          const snapFormData = new FormData();
          snapFormData.append("type", "image");
          snapFormData.append("file", snapshotFile);

          const snapRes = await fetch("/api/upload", { method: "POST", body: snapFormData });
          const snapData = await snapRes.json();

          if (snapData.success && snapData.file?.url) {
            finalThumbnailUrl = snapData.file.url;
          } else {
            console.warn("[model-editor] Snapshot upload failed:", snapData);
          }
        }
      } catch (err) {
        console.error("[model-editor] Upload error:", err);
      }
    }

    const updated = {
      ...draftModel,
      url: finalUrl,
      fileSize: finalSize,
      thumbnailUrl: finalThumbnailUrl,
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
          <p
            style={{
              color: "#a3a3a3",
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
            }}
          >
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
    <div className="flex flex-col h-[calc(100vh-56px)] bg-[#050507] overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#0B011D]/80 border-b border-purple-500/20 backdrop-blur-xl shrink-0 gap-4 flex-wrap z-10">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">New Product</span>
          <span className="text-white/10 text-xs">/</span>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400">3D Configuration Studio</span>
        </div>

        <div className="flex items-center gap-4 bg-white/[0.03] border border-white/5 px-4 py-2 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-purple-600/10 flex items-center justify-center text-purple-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-white leading-none">
              {draftModel.filename || "3D Model"}
            </p>
            {draftModel.fileSize && (
              <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mt-1 leading-none">
                {(draftModel.fileSize / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <p className="hidden lg:block text-[9px] font-black uppercase tracking-[0.15em] text-white/30 max-w-xs leading-relaxed">
            Use the studio tools to define measurements and annotations. Click <span className="text-white">SAVE_&_FINISH</span> when done.
          </p>
          <button
            id="cancelEditorBtn"
            onClick={handleCancel}
            className="px-5 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/20 transition-all flex items-center gap-2 group"
          >
            <span>✕ Cancel Edits</span>
          </button>
        </div>
      </div>

      {/* Editor canvas — takes all remaining height */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
        <Editor3DWrapper
          modelUrl={draftModel.url}
          initialAnnotations={draftModel.annotations || []}
          initialCameraState={draftModel.cameraState || null}
          onSave={handleSave}
          readOnly={false}
        />
      </div>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
