"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Editor3DWrapper
 * 
 * Embeds the standalone Vite 3D editor via an iframe.
 * Communicates via window.postMessage.
 */
export default function Editor3DWrapper({
  modelUrl,
  initialAnnotations = [],
  initialMeasurements = [],
  initialCameraState = null,
  onSave,
  onCancel,
  resourceId,
  resourceType,
  readOnly = false,
}) {
  const iframeRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // You can set this to the Vercel URL of the deployed Vite app, or a local dev URL
  const EDITOR_URL = process.env.NEXT_PUBLIC_3D_EDITOR_URL || "http://localhost:5173";

  useEffect(() => {
    const handleMessage = (event) => {
      // Security check: ensure message comes from our editor
      if (!event.origin.startsWith(EDITOR_URL)) return;

      if (event.data?.type === "EDITOR_READY") {
        setIsReady(true);
      } else if (event.data?.type === "SAVE_COMPLETE") {
        if (onSave) {
          onSave(event.data.payload);
        }
      } else if (event.data?.type === "EDITOR_CANCELLED") {
        if (onCancel) {
          onCancel();
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [EDITOR_URL, onSave, onCancel]);

  useEffect(() => {
    if (isReady && iframeRef.current) {
      // Pass the session token so the editor can hit our Next.js API
      // Since it's client side, we might have a token or the browser handles cookies.
      // Assuming Next.js /api uses cookie auth, the iframe might need credentials,
      // but if the iframe is cross-origin, cookies won't be sent unless SameSite=None.
      // So we'll pass a dummy token, or rely on the main app to handle DB updates if needed.
      iframeRef.current.contentWindow.postMessage(
        {
          type: "LOAD_MODEL",
          payload: {
            modelUrl,
            annotations: initialAnnotations,
            measurements: initialMeasurements,
            cameraState: initialCameraState,
            resourceId,
            resourceType,
            authToken: null,
            readOnly,
          },
        },
        EDITOR_URL
      );
    }
  }, [isReady, modelUrl, initialAnnotations, initialMeasurements, initialCameraState, resourceId, resourceType, readOnly, EDITOR_URL]);

  return (
    <div className="relative w-full h-full bg-[#0e0e12] overflow-hidden">
      {!isReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <div className="w-6 h-6 border-2 border-white/10 border-t-[#eb9728] rounded-full animate-spin mb-3" />
          <p className="text-[10px] font-mono text-white/50 uppercase tracking-widest">
            Loading Editor Suite...
          </p>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={EDITOR_URL}
        className="w-full h-full border-none"
        allow="cross-origin-isolated"
        title="3D Annotation Editor"
      />
    </div>
  );
}
