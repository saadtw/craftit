"use client";

import React, { useMemo, useState } from "react";
import { useAnnotations } from "./AnnotationStore";

export default function TagForm({
  screenX,
  screenY,
  worldPosition,
  meshName,
  onClose,
}) {
  const { dispatch } = useAnnotations();
  const [label, setLabel] = useState("");
  const [colour, setColour] = useState("#6ee7f7");
  const position = useMemo(() => {
    if (typeof window === "undefined") {
      return { x: screenX, y: screenY };
    }
    const adjustedX = Math.min(screenX, window.innerWidth - 280);
    const adjustedY = Math.min(screenY, window.innerHeight - 180);
    return { x: adjustedX, y: adjustedY };
  }, [screenX, screenY]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) return;
    const tag = {
      id: crypto.randomUUID(),
      worldPosition,
      label: label.trim(),
      colour,
      meshName,
    };
    dispatch({ type: "ADD_TAG", payload: tag });
    onClose();
  };

  return (
    <div
      id="tagFormPopup"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        zIndex: 1000,
        width: "260px",
        background: "#1a1a1a",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "4px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "14px", color: "#737373" }}
          >
            label
          </span>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "12px",
              fontWeight: 700,
              color: "white",
              letterSpacing: "-0.01em",
            }}
          >
            Add Tag
          </span>
        </div>
        {meshName && (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "9px",
              color: "#525252",
              background: "rgba(255,255,255,0.06)",
              padding: "2px 6px",
              borderRadius: "2px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100px",
            }}
          >
            {meshName}
          </span>
        )}
      </div>

      {/* Form body */}
      <form onSubmit={handleSubmit} style={{ padding: "14px" }}>
        <input
          autoFocus
          id="tagLabelInput"
          placeholder="Enter label…"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "2px",
            color: "white",
            fontFamily: "'Inter', sans-serif",
            fontSize: "12px",
            padding: "8px 10px",
            outline: "none",
            boxSizing: "border-box",
            marginBottom: "10px",
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
        />

        {/* Colour row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "9px",
              color: "#737373",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Colour
          </span>
          <input
            type="color"
            id="tagColourInput"
            value={colour}
            onChange={(e) => setColour(e.target.value)}
            style={{
              width: "28px",
              height: "24px",
              border: "none",
              background: "none",
              cursor: "pointer",
              padding: 0,
            }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "10px",
              color: "#a3a3a3",
            }}
          >
            {colour.toUpperCase()}
          </span>
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              background: colour,
              marginLeft: "auto",
              border: "1px solid rgba(255,255,255,0.15)",
              flexShrink: 0,
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "8px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "2px",
              color: "#737373",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              flex: 1,
              padding: "8px",
              background: label.trim() ? "white" : "#262626",
              border: "none",
              borderRadius: "2px",
              color: label.trim() ? "#0a0a0a" : "#525252",
              cursor: label.trim() ? "pointer" : "not-allowed",
              fontFamily: "'Inter', sans-serif",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              transition: "all 0.15s",
            }}
          >
            Add Tag
          </button>
        </div>
      </form>
    </div>
  );
}
