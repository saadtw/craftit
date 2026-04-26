export interface EngineConfig {
  containerId?: string;
  backgroundColor?: string;
  autoRotate?: boolean;
  readOnly?: boolean;
}

export interface CameraState {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
  zoom: number;
}

export interface Annotation {
  id: string;
  text: string;
  position: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
}

export interface SceneObject {
  uuid: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

export type EditorToolState = 'move' | 'rotate' | 'scale' | 'annotate' | 'measure' | 'none';
