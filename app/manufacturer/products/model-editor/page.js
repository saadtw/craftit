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
  const [returnUrl, setReturnUrl] = useState("/manufacturer/products/new");

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // ── Read draft from sessionStorage on mount ────────────────────────────────
  useEffect(() => {
    // Read the return URL first
    const savedReturnUrl = sessionStorage.getItem("modelEditorReturnUrl");
    if (savedReturnUrl) setReturnUrl(savedReturnUrl);

    // sessionStorage is only available in the browser
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) {
      // No draft data — the user navigated here directly. Send them back.
      // We intentionally set state here to trigger the deferred redirect effect below.
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
      router.push(returnUrl);
    }
  }, [shouldRedirect, router, returnUrl]);

  // ── onSave: called by Editor3DWrapper when the Vite iframe fires SAVE_COMPLETE ──
  //
  // IMPORTANT: The Vite editor always exports a gltfBlob, but we intentionally
  // ignore it. Annotations/tags/camera are pure JSON metadata stored in MongoDB.
  // The original GLB stays untouched — no need to re-upload 8+ MB for a tag change.
  const handleSave = async (payload) => {
    setIsSaving(true);

    try {
      const { annotations, measurements, cameraState } = payload || {};

      const normalizedAnnotations = Array.isArray(annotations)
        ? annotations
        : [];
      const normalizedMeasurements = Array.isArray(measurements)
        ? measurements
        : [];

      // ── Path A: Existing product — save directly to MongoDB ─────────────────
      const productId = sessionStorage.getItem("modelEditorProductId");
      if (productId) {
        const patchRes = await fetch("/api/models/update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resourceId: productId,
            resourceType: "product",
            newModelUrl: draftModel.url,
            annotations: normalizedAnnotations,
            measurements: normalizedMeasurements,
            cameraState: cameraState || null,
          }),
        });
        const patchData = await patchRes.json();
        if (!patchData.success) {
          console.error(
            "[model-editor] MongoDB PATCH failed:",
            patchData.error,
          );
        }

        // Update the draft model so the edit page can restore the latest annotations
        const updated = {
          ...draftModel,
          annotations: normalizedAnnotations,
          measurements: normalizedMeasurements,
          cameraState: cameraState || null,
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));

        // Clean up only the ID (draftProductForm is needed by the return page)
        sessionStorage.removeItem("modelEditorProductId");
        router.push(returnUrl);
        return;
      }

      // ── Path B: New product — write back to sessionStorage ──────────────────
      const updated = {
        ...draftModel,
        annotations: normalizedAnnotations,
        measurements: normalizedMeasurements,
        cameraState: cameraState || null,
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error("[model-editor] Save error:", err);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(draftModel));
    } finally {
      setIsSaving(false);
      router.push(returnUrl);
    }
  };

  // ── handleCancel: discard edits, return without writing ───────────────────
  const handleCancel = () => {
    // Leave sessionStorage intact so the /new page can still restore the
    // original model URL and any previously saved annotations.
    router.push(returnUrl);
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
        <div
          className="h-10 w-10 shrink-0 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin"
          aria-hidden
        />
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
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
            New Product
          </span>
          <span className="text-white/10 text-xs">/</span>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400">
            3D Configuration Studio
          </span>
        </div>

        <div className="flex items-center gap-4 bg-white/3 border border-white/5 px-4 py-2 rounded-xl">
          <div className="w-8 h-8 rounded-lg bg-purple-600/10 flex items-center justify-center text-purple-400">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
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
            Use the studio tools to define measurements and annotations. Click{" "}
            <span className="text-white">SAVE_&_FINISH</span> when done.
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
          initialMeasurements={draftModel.measurements || []}
          initialCameraState={draftModel.cameraState || null}
          onSave={handleSave}
          readOnly={false}
        />
      </div>

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
