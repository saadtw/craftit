/**
 * craftit-3d-editor/src/App.jsx
 *
 * Root component of the standalone 3D editor sub-site.
 * Communicates with the parent Craftit Next.js app via postMessage.
 *
 * Protocol:
 *  Outbound  → { type: 'EDITOR_READY' }
 *  Inbound   ← { type: 'LOAD_MODEL', payload: { modelUrl, annotations, cameraState, resourceId, resourceType, authToken } }
 *  Outbound  → { type: 'SAVE_COMPLETE', payload: { modelUrl, annotations, cameraState } }
 *  Outbound  → { type: 'EDITOR_CANCELLED' }
 */
import React, { useEffect, useState, useCallback } from 'react';
import { AnnotationProvider } from './components/AnnotationStore';
import EditorCanvas from './components/EditorCanvas';
import Toolbar from './components/Toolbar';

const MAIN_APP_URL = import.meta.env.VITE_MAIN_APP_URL || '*';

export default function App() {
  const [editorData, setEditorData] = useState(null); // { modelUrl, annotations, cameraState, resourceId, resourceType, authToken }
  const [status, setStatus] = useState('waiting'); // 'waiting' | 'loading' | 'ready' | 'error'

  // 1. Signal parent that the iframe is ready to receive LOAD_MODEL
  useEffect(() => {
    window.parent.postMessage({ type: 'EDITOR_READY' }, '*');
  }, []);

  // 2. Listen for LOAD_MODEL from parent
  useEffect(() => {
    function handleMessage(event) {
      if (!event.data || event.data.type !== 'LOAD_MODEL') return;
      const { modelUrl, annotations, measurements, cameraState, resourceId, resourceType, authToken } = event.data.payload || {};
      if (!modelUrl) {
        setStatus('error');
        return;
      }
      setEditorData({ modelUrl, annotations, measurements, cameraState, resourceId, resourceType, authToken });
      setStatus('ready');
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 3. Handle save — notify parent with annotations + measurements
  const handleSave = useCallback(async (gltfBlob, tags, measurements, snapshotBlob) => {
    if (!editorData) return;

    const annotations = Array.isArray(tags) ? tags : [];
    const meas = Array.isArray(measurements) ? measurements : [];

    // Send annotations, measurements, and original URL back to the parent.
    // The parent (model-editor/page.js) handles persisting to MongoDB.
    // We intentionally ignore the gltfBlob — annotations are JSON metadata only.
    const payload = {
      modelUrl: editorData.modelUrl,
      annotations,
      measurements: meas,
      cameraState: null,
    };

    // Notify parent
    window.parent.postMessage({ type: 'SAVE_COMPLETE', payload }, '*');
  }, [editorData]);

  const handleCancel = useCallback(() => {
    window.parent.postMessage({ type: 'EDITOR_CANCELLED' }, '*');
  }, []);

  // ── Waiting for LOAD_MODEL ──────────────────────────────────────────────
  if (status === 'waiting') {
    return (
      <div style={S.center}>
        <div style={S.spinner} />
        <p style={S.hint}>Waiting for model data…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={S.center}>
        <p style={{ ...S.hint, color: '#ffb4ab' }}>⚠ Failed to load editor data.</p>
        <button style={S.cancelBtn} onClick={handleCancel}>Close</button>
      </div>
    );
  }

  // ── Editor ready ────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'row', background: '#0e0e12', overflow: 'hidden' }}>
      <AnnotationProvider
        modelUrl={editorData.modelUrl}
        initialAnnotations={editorData.annotations}
        initialMeasurements={editorData.measurements}
        initialCameraState={editorData.cameraState}
        readOnly={false}
      >
        <EditorCanvas modelUrl={editorData.modelUrl} />
        <Toolbar modelUrl={editorData.modelUrl} onSave={handleSave} readOnly={false} onCancel={handleCancel} />
      </AnnotationProvider>
    </div>
  );
}

const S = {
  center: {
    width: '100vw', height: '100vh',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: '#0e0e12', gap: '12px',
  },
  spinner: {
    width: '28px', height: '28px',
    border: '2px solid rgba(255,255,255,0.08)',
    borderTopColor: 'white', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  hint: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '10px', color: '#525252',
    letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0,
  },
  cancelBtn: {
    padding: '8px 20px', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px',
    color: '#a3a3a3', cursor: 'pointer',
    fontFamily: "'Inter', sans-serif", fontSize: '12px',
  },
};
