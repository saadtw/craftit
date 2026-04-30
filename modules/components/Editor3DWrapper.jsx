"use client";

import React from "react";
import { AnnotationProvider } from "../3d-engine/components/AnnotationStore";
import EditorCanvas from "../3d-engine/components/EditorCanvas";
import TagOverlay from "../3d-engine/components/TagOverlay";
import Toolbar from "../3d-engine/components/Toolbar";

export default function Editor3DWrapper({
  modelUrl,
  initialAnnotations,
  initialCameraState,
  onSave,
  readOnly = false,
}) {
  return (
    <div className="relative w-full h-full flex flex-row bg-gray-900 overflow-hidden">
      <AnnotationProvider
        modelUrl={modelUrl}
        initialAnnotations={initialAnnotations}
        initialCameraState={initialCameraState}
        readOnly={readOnly}
      >
        <EditorCanvas modelUrl={modelUrl} />
        <Toolbar onSave={onSave} readOnly={readOnly} />
      </AnnotationProvider>
    </div>
  );
}
