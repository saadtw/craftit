// Adapted from modules/3d-engine/components/AnnotationStore.jsx
// Changes: removed 'use client' directive (not needed in Vite)
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react';

const initialState = {
  activeTool: 'select',
  scaleUnit: 'units',
  tags: [],
  measurements: [],
  selectedMeshName: null,
  measurePointA: null,
  pendingTag: null,
  pendingMeasurement: null,
  showGrid: true,
  isInteracting: false,
  isReadOnly: false,
};

const HISTORY_ACTIONS = new Set([
  'ADD_TAG', 'DELETE_TAG',
  'ADD_MEASUREMENT', 'DELETE_MEASUREMENT',
  'CLEAR_ALL',
]);

function coreReducer(state, action) {
  if (state.isReadOnly) {
    const mutationTypes = [
      'SET_TOOL', 'ADD_TAG', 'DELETE_TAG',
      'ADD_MEASUREMENT', 'DELETE_MEASUREMENT',
      'SET_MEASURE_POINT_A', 'SET_PENDING_TAG', 'SET_PENDING_MEASUREMENT', 'CLEAR_ALL',
    ];
    if (mutationTypes.includes(action.type)) return state;
  }

  switch (action.type) {
    case 'SET_READ_ONLY':
      return { ...state, isReadOnly: action.payload, activeTool: 'select' };
    case 'SET_TOOL':
      return { ...state, activeTool: action.payload, measurePointA: null, pendingTag: null };
    case 'SET_SCALE':
      return { ...state, scaleUnit: action.payload };
    case 'ADD_TAG':
      return { ...state, tags: [...state.tags, action.payload], pendingTag: null };
    case 'DELETE_TAG':
      return { ...state, tags: state.tags.filter((t) => t.id !== action.payload) };
    case 'ADD_MEASUREMENT':
      return { ...state, measurements: [...state.measurements, action.payload], measurePointA: null, pendingMeasurement: null };
    case 'DELETE_MEASUREMENT':
      return { ...state, measurements: state.measurements.filter((m) => m.id !== action.payload) };
    case 'SET_PENDING_MEASUREMENT':
      return { ...state, pendingMeasurement: action.payload };
    case 'SET_SELECTED_MESH':
      return { ...state, selectedMeshName: action.payload };
    case 'SET_MEASURE_POINT_A':
      return { ...state, measurePointA: action.payload };
    case 'SET_PENDING_TAG':
      return { ...state, pendingTag: action.payload };
    case 'SET_INTERACTING':
      return { ...state, isInteracting: action.payload };
    case 'CLEAR_ALL':
      return { ...state, tags: [], measurements: [], measurePointA: null, pendingTag: null, pendingMeasurement: null, selectedMeshName: null };
    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid };
    case 'LOAD':
      return { ...state, tags: action.payload.tags, measurements: action.payload.measurements, showGrid: action.payload.showGrid !== undefined ? action.payload.showGrid : true };
    default:
      return state;
  }
}

const SNAPSHOT_KEYS = ['tags', 'measurements'];
function snapshot(state) {
  return Object.fromEntries(SNAPSHOT_KEYS.map((k) => [k, state[k]]));
}

function reducer(withHistory, action) {
  const { past, present, future } = withHistory;
  if (action.type === 'UNDO') {
    if (past.length === 0) return withHistory;
    const previous = past[past.length - 1];
    return { past: past.slice(0, -1), present: { ...present, ...previous }, future: [snapshot(present), ...future] };
  }
  if (action.type === 'REDO') {
    if (future.length === 0) return withHistory;
    const next = future[0];
    return { past: [...past, snapshot(present)], present: { ...present, ...next }, future: future.slice(1) };
  }
  const newPresent = coreReducer(present, action);
  if (newPresent === present) return withHistory;
  if (HISTORY_ACTIONS.has(action.type)) {
    return { past: [...past, snapshot(present)], present: newPresent, future: [] };
  }
  return { past, present: newPresent, future };
}

const AnnotationContext = createContext(null);

export function AnnotationProvider({ children, modelUrl, initialAnnotations, initialMeasurements, initialCameraState, readOnly = false }) {
  const [history, dispatch] = useReducer(reducer, { past: [], present: initialState, future: [] });
  const state = history.present;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  const sceneRef = React.useRef(null);

  useEffect(() => { dispatch({ type: 'SET_READ_ONLY', payload: readOnly }); }, [readOnly]);
  useEffect(() => {
    const hasTags = initialAnnotations && initialAnnotations.length > 0;
    const hasMeasurements = initialMeasurements && initialMeasurements.length > 0;
    if (hasTags || hasMeasurements) {
      dispatch({ type: 'LOAD', payload: {
        tags: initialAnnotations || [],
        measurements: initialMeasurements || [],
        showGrid: true
      } });
    }
  }, [initialAnnotations, initialMeasurements]);

  const exportJSON = useCallback(() => {
    const data = { tags: state.tags, measurements: state.measurements, showGrid: state.showGrid };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotations.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  return (
    <AnnotationContext.Provider value={{ state, dispatch, exportJSON, sceneRef, canUndo, canRedo }}>
      {children}
    </AnnotationContext.Provider>
  );
}

export function useAnnotations() {
  const ctx = useContext(AnnotationContext);
  if (!ctx) throw new Error('useAnnotations must be used inside AnnotationProvider');
  return ctx;
}
