'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react';

// ─── Initial State ────────────────────────────────────────────────────────────
const initialState = {
  activeTool: 'select',
  scaleUnit: 'units',
  paintColour: '#ff6b35',
  tags: [],
  measurements: [],
  componentMarks: {},
  selectedMeshName: null,
  measurePointA: null,
  pendingTag: null,
  pendingMeasurement: null,
  showGrid: true,
  isInteracting: false,
  isReadOnly: false,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducer(state, action) {
  if (state.isReadOnly) {
    const mutationTypes = [
      'SET_TOOL',
      'SET_PAINT_COLOUR',
      'ADD_TAG',
      'DELETE_TAG',
      'ADD_MEASUREMENT',
      'DELETE_MEASUREMENT',
      'SET_COMPONENT_MARK',
      'SET_MEASURE_POINT_A',
      'SET_PENDING_TAG',
      'SET_PENDING_MEASUREMENT',
      'CLEAR_ALL',
    ];
    if (mutationTypes.includes(action.type)) {
      return state;
    }
  }

  switch (action.type) {
    case 'SET_READ_ONLY':
      return { ...state, isReadOnly: action.payload, activeTool: 'select' };
    case 'SET_TOOL':
      return { ...state, activeTool: action.payload, measurePointA: null, pendingTag: null };
    case 'SET_SCALE':
      return { ...state, scaleUnit: action.payload };
    case 'SET_PAINT_COLOUR':
      return { ...state, paintColour: action.payload };
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
    case 'SET_COMPONENT_MARK':
      return {
        ...state,
        componentMarks: {
          ...state.componentMarks,
          [action.payload.meshName]: action.payload,
        },
      };
    case 'SET_SELECTED_MESH':
      return { ...state, selectedMeshName: action.payload };
    case 'SET_MEASURE_POINT_A':
      return { ...state, measurePointA: action.payload };
    case 'SET_PENDING_TAG':
      return { ...state, pendingTag: action.payload };
    case 'SET_INTERACTING':
      return { ...state, isInteracting: action.payload };
    case 'CLEAR_ALL':
      return { 
        ...state, 
        tags: [], 
        measurements: [], 
        componentMarks: {}, 
        measurePointA: null, 
        pendingTag: null, 
        pendingMeasurement: null,
        selectedMeshName: null 
      };
    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid };
    case 'LOAD':
      return {
        ...state,
        tags: action.payload.tags,
        measurements: action.payload.measurements,
        componentMarks: action.payload.componentMarks,
        showGrid: action.payload.showGrid !== undefined ? action.payload.showGrid : true,
      };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AnnotationContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AnnotationProvider({ children, modelUrl, initialAnnotations, initialCameraState, readOnly = false }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const sceneRef = React.useRef(null);

  useEffect(() => {
    dispatch({ type: 'SET_READ_ONLY', payload: readOnly });
  }, [readOnly]);

  // Load on mount
  useEffect(() => {
    if (initialAnnotations && initialAnnotations.length > 0) {
      dispatch({ 
        type: 'LOAD', 
        payload: { 
          tags: initialAnnotations, 
          measurements: [], 
          componentMarks: {}, 
          showGrid: true 
        } 
      });
    }
  }, [initialAnnotations]);

  const exportJSON = useCallback(() => {
    const data = {
      tags: state.tags,
      measurements: state.measurements,
      componentMarks: state.componentMarks,
      showGrid: state.showGrid,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotations.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  return (
    <AnnotationContext.Provider value={{ state, dispatch, exportJSON, sceneRef }}>
      {children}
    </AnnotationContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAnnotations() {
  const ctx = useContext(AnnotationContext);
  if (!ctx) throw new Error('useAnnotations must be used inside AnnotationProvider');
  return ctx;
}
