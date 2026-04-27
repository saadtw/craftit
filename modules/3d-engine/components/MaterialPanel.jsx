"use client";

import React, { useState } from "react";
import { useAnnotations } from "./AnnotationStore";

export default function MaterialPanel() {
  const { state, dispatch } = useAnnotations();

  const meshName = state.selectedMeshName;
  const existing = meshName ? state.componentMarks[meshName] : null;

  const markedComponents = Object.values(state.componentMarks);

  const S = {
    aside: {
      width: "260px",
      flexShrink: 0,
      background: "#0e0e0e",
      borderLeft: "1px solid rgba(255,255,255,0.06)",
      display: "flex",
      flexDirection: "column",
      overflowY: "auto",
    },
    header: {
      padding: "16px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      flexShrink: 0,
    },
    sectionLabel: {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "9px",
      color: "#525252",
      textTransform: "uppercase",
      letterSpacing: "0.15em",
      padding: "14px 16px 6px",
    },
    input: {
      width: "100%",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "2px",
      color: "white",
      fontFamily: "'Inter', sans-serif",
      fontSize: "12px",
      padding: "8px 10px",
      outline: "none",
      boxSizing: "border-box",
    },
    textarea: {
      width: "100%",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "2px",
      color: "white",
      fontFamily: "'Inter', sans-serif",
      fontSize: "12px",
      padding: "8px 10px",
      outline: "none",
      resize: "none",
      boxSizing: "border-box",
    },
    label: {
      display: "block",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "9px",
      color: "#737373",
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      marginBottom: "6px",
    },
    saveBtn: (isSaved) => ({
      width: "100%",
      padding: "10px",
      background: isSaved ? "rgba(34,197,94,0.15)" : "white",
      border: isSaved ? "1px solid rgba(34,197,94,0.3)" : "none",
      borderRadius: "2px",
      color: isSaved ? "#86efac" : "#0a0a0a",
      cursor: "pointer",
      fontFamily: "'Inter', sans-serif",
      fontSize: "10px",
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      transition: "all 0.15s",
    }),
    divider: {
      height: "1px",
      background: "rgba(255,255,255,0.06)",
      margin: "4px 0",
    },
  };

  return (
    <aside style={S.aside}>
      {/* Header */}
      <div style={S.header}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: "18px", color: "#737373" }}
        >
          category
        </span>
        <div>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              fontWeight: 900,
              color: "white",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            INSPECTOR
          </p>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "9px",
              color: "#525252",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Component Analysis
          </span>
        </div>
      </div>

      {/* Selected mesh info */}
      {meshName ? (
        <div>
          <div style={S.sectionLabel}>Selected Mesh</div>
          <div style={{ padding: "0 16px 12px" }}>
            {/* Mesh name chip */}
            <div
              style={{
                padding: "6px 10px",
                background: "rgba(255,255,255,0.06)",
                borderRadius: "2px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "10px",
                color: "#a3a3a3",
                letterSpacing: "0.06em",
                marginBottom: "14px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {meshName}
            </div>

            <SelectedMeshEditor
              key={`${meshName}-${existing?.displayName || ""}-${existing?.notes || ""}-${existing?.highlightColour || ""}`}
              meshName={meshName}
              existing={existing}
              styles={S}
              onSave={(mark) =>
                dispatch({ type: "SET_COMPONENT_MARK", payload: mark })
              }
            />
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "32px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "36px", color: "#262626" }}
          >
            touch_app
          </span>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "9px",
              color: "#525252",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              textAlign: "center",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Use SELECT tool and
            <br />
            click a mesh to inspect
          </p>
        </div>
      )}

      <div style={S.divider} />

      {/* Measurements list */}
      {state.measurements.length > 0 && (
        <div>
          <div style={S.sectionLabel}>
            Measurements ({state.measurements.length})
          </div>
          <div
            style={{
              padding: "0 16px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {state.measurements.map((m) => (
              <div
                id={`measurement-${m.id}`}
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 10px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "2px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "10px",
                    color: "#a3a3a3",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {m.label || `DIM_${m.id.slice(0, 4).toUpperCase()}`}
                </span>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "#525252",
                    cursor: "pointer",
                    padding: "0 4px",
                    fontSize: "14px",
                  }}
                  onClick={() =>
                    dispatch({ type: "DELETE_MEASUREMENT", payload: m.id })
                  }
                  aria-label="Delete measurement"
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#ffb4ab")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#525252")
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Component marks list */}
      {markedComponents.length > 0 && (
        <div>
          <div style={S.sectionLabel}>
            Marked Components ({markedComponents.length})
          </div>
          <div
            style={{
              padding: "0 16px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {markedComponents.map((c) => (
              <div
                key={c.meshName}
                onClick={() =>
                  dispatch({ type: "SET_SELECTED_MESH", payload: c.meshName })
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 10px",
                  cursor: "pointer",
                  background:
                    state.selectedMeshName === c.meshName
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(255,255,255,0.03)",
                  border: `1px solid ${state.selectedMeshName === c.meshName ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: "2px",
                  transition: "all 0.15s",
                }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: c.highlightColour,
                    flexShrink: 0,
                  }}
                />
                <div style={{ overflow: "hidden" }}>
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "white",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {c.displayName || c.meshName}
                  </div>
                  {c.notes && (
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "9px",
                        color: "#525252",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c.notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

function SelectedMeshEditor({ meshName, existing, styles, onSave }) {
  const [displayName, setDisplayName] = useState(
    existing?.displayName || meshName || "",
  );
  const [notes, setNotes] = useState(existing?.notes || "");
  const [highlightColour, setHighlightColour] = useState(
    existing?.highlightColour || "#ff6b35",
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!meshName) return;
    onSave({
      meshName,
      displayName: displayName || meshName,
      notes,
      highlightColour,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <span style={styles.label}>Display Name</span>
        <input
          id="displayNameInput"
          style={styles.input}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Enter a friendly name…"
        />
      </div>

      <div>
        <span style={styles.label}>Highlight Colour</span>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="color"
            id="highlightColourInput"
            value={highlightColour}
            onChange={(e) => setHighlightColour(e.target.value)}
            style={{
              width: "36px",
              height: "32px",
              border: "none",
              background: "none",
              cursor: "pointer",
              padding: 0,
            }}
          />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              color: "#a3a3a3",
            }}
          >
            {highlightColour.toUpperCase()}
          </span>
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: highlightColour,
              marginLeft: "auto",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          />
        </div>
      </div>

      <div>
        <span style={styles.label}>Notes</span>
        <textarea
          id="componentNotesInput"
          style={styles.textarea}
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes or description…"
        />
      </div>

      <button
        id="saveComponentBtn"
        style={styles.saveBtn(saved)}
        onClick={handleSave}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: "14px" }}
        >
          {saved ? "check_circle" : "save"}
        </span>
        {saved ? "SAVED" : "MARK_COMPONENT"}
      </button>
    </div>
  );
}
