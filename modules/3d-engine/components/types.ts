// ─── Active Tool ─────────────────────────────────────────────────────────────
export type ActiveTool = 'select' | 'tag' | 'measure' | 'paint';

// ─── Scale Units ─────────────────────────────────────────────────────────────
export type ScaleUnit = 'mm' | 'cm' | 'm' | 'in' | 'ft' | 'units';

export const SCALE_FACTORS: Record<ScaleUnit, number> = {
  mm: 1000,
  cm: 100,
  m: 1,
  in: 39.3701,
  ft: 3.28084,
  units: 1,
};

// ─── Tag ─────────────────────────────────────────────────────────────────────
export interface Tag {
  id: string;
  worldPosition: [number, number, number];
  label: string;
  colour: string;
  meshName?: string;
}

// ─── Measurement ─────────────────────────────────────────────────────────────
export interface Measurement {
  id: string;
  pointA: [number, number, number];
  pointB: [number, number, number];
  /** Raw Three.js unit distance */
  distanceRaw: number;
  /** User-readable label (auto-generated, can be overridden) */
  label?: string;
}

// ─── Component Mark ──────────────────────────────────────────────────────────
export interface ComponentMark {
  meshName: string;
  displayName: string;
  notes: string;
  highlightColour: string;
  originalColour?: string;
}

// ─── Tag Form State ──────────────────────────────────────────────────────────
export interface PendingTag {
  screenX: number;
  screenY: number;
  worldPosition: [number, number, number];
  meshName?: string;
}

// ─── Measurement Form State ──────────────────────────────────────────────────
export interface PendingMeasurement {
  pointA: [number, number, number];
  pointB: [number, number, number];
  screenX: number;
  screenY: number;
}

// ─── Annotation State ────────────────────────────────────────────────────────
export interface AnnotationState {
  activeTool: ActiveTool;
  scaleUnit: ScaleUnit;
  paintColour: string;
  tags: Tag[];
  measurements: Measurement[];
  componentMarks: Record<string, ComponentMark>;
  selectedMeshName: string | null;
  /** Primary point tracked during drag */
  measurePointA: [number, number, number] | null;
  pendingTag: PendingTag | null;
  pendingMeasurement: PendingMeasurement | null;
  showGrid: boolean;
  isInteracting: boolean;
  isReadOnly: boolean;
}

// ─── Saved Model (for localStorage saved list) ────────────────────────────────
export interface SavedModel {
  id: string;
  name: string;
  modelUrl: string;
  timestamp: number;
  thumbnail?: string;
}

// ─── Persisted Annotation Data ───────────────────────────────────────────────
export interface PersistedAnnotations {
  tags: Tag[];
  measurements: Measurement[];
  componentMarks: Record<string, ComponentMark>;
  showGrid: boolean;
}
