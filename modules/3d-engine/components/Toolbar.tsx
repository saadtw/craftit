'use client';

import React from 'react';
import { useAnnotations } from './AnnotationStore';
import type { ActiveTool, ScaleUnit } from './types';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const TOOLS: { id: ActiveTool; icon: string; label: string }[] = [
  { id: 'select', icon: 'arrow_selector_tool', label: 'SELECT' },
  { id: 'tag', icon: 'label', label: 'TAG' },
  { id: 'measure', icon: 'straighten', label: 'MEASURE' },
  { id: 'paint', icon: 'colors', label: 'PAINT' },
];

const SCALE_OPTIONS: { value: ScaleUnit; label: string }[] = [
  { value: 'units', label: 'Units' },
  { value: 'mm', label: 'mm' },
  { value: 'cm', label: 'cm' },
  { value: 'm', label: 'm' },
  { value: 'in', label: 'in' },
  { value: 'ft', label: 'ft' },
];

interface ToolbarProps {
  modelUrl?: string;
  onSave?: (gltfBlob: Blob, annotations: any[], cameraState: any) => void;
  readOnly?: boolean;
}

const S = {
  aside: {
    width: '220px',
    flexShrink: 0,
    background: '#0e0e0e',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column' as const,
    overflowY: 'auto' as const,
    padding: '16px 0',
  },
  logo: {
    padding: '0 16px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    marginBottom: '8px',
  },
  logoTitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px',
    fontWeight: 900,
    letterSpacing: '-0.03em',
    color: 'white',
    margin: 0,
  },
  logoSub: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '9px',
    color: '#525252',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.15em',
  },
  sectionLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '9px',
    color: '#525252',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.15em',
    padding: '12px 16px 6px',
  },
  toolBtn: (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '8px 16px',
    background: active ? 'rgba(255,255,255,0.08)' : 'none',
    border: 'none',
    borderLeft: active ? '2px solid white' : '2px solid transparent',
    color: active ? 'white' : '#737373',
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    transition: 'all 0.15s',
    textAlign: 'left' as const,
  }),
  divider: {
    height: '1px',
    background: 'rgba(255,255,255,0.06)',
    margin: '12px 0',
  },
  statRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 16px',
  },
  statLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '9px',
    color: '#525252',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },
  statValue: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '12px',
    color: 'white',
    fontWeight: 700,
  },
  select: {
    margin: '4px 16px',
    padding: '7px 10px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '2px',
    color: 'white',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '10px',
    width: 'calc(100% - 32px)',
    outline: 'none',
    cursor: 'pointer',
  },
  actionBtn: (variant: 'primary' | 'secondary' | 'danger') => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: 'calc(100% - 32px)',
    margin: '4px 16px',
    padding: '9px 12px',
    background: variant === 'primary' ? 'white' : variant === 'danger' ? 'rgba(147,0,10,0.15)' : 'rgba(255,255,255,0.06)',
    border: variant === 'danger' ? '1px solid rgba(147,0,10,0.3)' : '1px solid rgba(255,255,255,0.08)',
    borderRadius: '2px',
    color: variant === 'primary' ? '#0a0a0a' : variant === 'danger' ? '#ffb4ab' : '#a3a3a3',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    transition: 'all 0.15s',
  }),
};

export default function Toolbar({ modelUrl, onSave, readOnly }: ToolbarProps) {
  const { state, dispatch, exportJSON, sceneRef } = useAnnotations();

  if (readOnly) return null;

  const handleSaveFinish = async () => {
    try {
      if (sceneRef && sceneRef.current) {
        const scene = sceneRef.current;
        const hiddenObjects: any[] = [];
        scene.traverse((child) => {
          if (
            child.type === 'GridHelper' ||
            child.type.includes('Light') ||
            child.type.includes('Camera') ||
            (child as any).isPreview
          ) {
            if (child.visible) {
              child.visible = false;
              hiddenObjects.push(child);
            }
          }
        });

        const exporter = new GLTFExporter();
        const exportData = await new Promise<ArrayBuffer | string>((resolve, reject) => {
          exporter.parse(
            scene,
            (result) => resolve(result as ArrayBuffer),
            (error) => reject(error),
            { binary: true, onlyVisible: true }
          );
        });
        hiddenObjects.forEach(child => { child.visible = true; });

        const blob = new Blob([exportData as ArrayBuffer], { type: 'model/gltf-binary' });
        
        // Fire the onSave callback with the GLTF blob, annotations, and camera state
        if (onSave) {
          // Pass null for cameraState for now until implemented in EditorCanvas
          onSave(blob, state.tags, null);
        }
      }
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const handleClearAll = () => {
    if (confirm('Clear all tags, measurements, and component marks?')) {
      dispatch({ type: 'CLEAR_ALL' });
    }
  };

  return (
    <aside style={S.aside}>
      {/* Logo */}
      <div style={S.logo}>
        <p style={S.logoTitle}>3D_EDITOR</p>
        <span style={S.logoSub}>Annotation Suite</span>
      </div>

      {/* Tools */}
      <div style={S.sectionLabel}>Active Tool</div>
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          id={`tool-${tool.id}`}
          style={S.toolBtn(state.activeTool === tool.id)}
          onClick={() => dispatch({ type: 'SET_TOOL', payload: tool.id })}
          title={tool.label}
          onMouseEnter={e => {
            if (state.activeTool !== tool.id) e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={e => {
            if (state.activeTool !== tool.id) e.currentTarget.style.color = '#737373';
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{tool.icon}</span>
          {tool.label}
        </button>
      ))}

      {/* Paint colour picker */}
      {state.activeTool === 'paint' && (
        <>
          <div style={S.sectionLabel}>Paint Colour</div>
          <div style={{ padding: '4px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="color"
              id="paintColourInput"
              value={state.paintColour}
              onChange={(e) => dispatch({ type: 'SET_PAINT_COLOUR', payload: e.target.value })}
              style={{ width: '32px', height: '28px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
            />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#a3a3a3' }}>
              {state.paintColour.toUpperCase()}
            </span>
          </div>
        </>
      )}

      {/* Measure hint */}
      {state.activeTool === 'measure' && (
        <div style={{ margin: '4px 16px', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '2px' }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#a3a3a3', margin: 0, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '12px', color: state.measurePointA ? '#6ee7f7' : '#a3a3a3' }}>pin_drop</span>
            {state.measurePointA ? 'Click Point B on model' : 'Click Point A on model'}
          </p>
        </div>
      )}

      <div style={S.divider} />

      {/* Scale selector */}
      <div style={S.sectionLabel}>Scale Unit</div>
      <select
        id="scaleUnitSelect"
        style={S.select}
        value={state.scaleUnit}
        onChange={(e) => dispatch({ type: 'SET_SCALE', payload: e.target.value as ScaleUnit })}
      >
        {SCALE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <div style={S.divider} />

      {/* Viewport */}
      <div style={S.sectionLabel}>Viewport</div>
      <button
        style={S.actionBtn('secondary')}
        onClick={() => dispatch({ type: 'TOGGLE_GRID' })}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>grid_on</span>
        {state.showGrid ? 'HIDE_GRID' : 'SHOW_GRID'}
      </button>

      <div style={S.divider} />

      {/* Stats */}
      <div style={S.sectionLabel}>Scene Stats</div>
      {[
        { label: 'Tags', value: state.tags.length, icon: 'label' },
        { label: 'Dims', value: state.measurements.length, icon: 'straighten' },
        { label: 'Marks', value: Object.keys(state.componentMarks).length, icon: 'category' },
      ].map(s => (
        <div key={s.label} style={S.statRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#525252' }}>{s.icon}</span>
            <span style={S.statLabel}>{s.label}</span>
          </div>
          <span style={S.statValue}>{s.value}</span>
        </div>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />
      <div style={S.divider} />

      {/* Actions */}
      <button id="clearAllBtn" style={S.actionBtn('danger')} onClick={handleClearAll}>
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete_sweep</span>
        CLEAR_ALL
      </button>
      <button id="exportBtn" style={S.actionBtn('secondary')} onClick={exportJSON}>
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span>
        EXPORT_JSON
      </button>
      <button id="saveFinishBtn" style={{ ...S.actionBtn('primary'), marginTop: '8px' }} onClick={handleSaveFinish}>
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>
        SAVE_&_FINISH
      </button>
    </aside>
  );
}
