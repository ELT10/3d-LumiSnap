import { create } from 'zustand';
import * as THREE from 'three';

// Define the types for our surface store
export type SurfaceType = 'wall' | 'ceiling' | 'floor' | 'unknown';

export interface SurfaceHit {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  surfaceType: SurfaceType;
  distance: number;
  object: THREE.Object3D;
  rotation: THREE.Euler;
}

interface SurfaceState {
  currentHit: SurfaceHit | null;
  isDragging: boolean;
  draggedFixtureData: unknown;
  setCurrentHit: (hit: SurfaceHit | null) => void;
  setIsDragging: (isDragging: boolean) => void;
  setDraggedFixtureData: (data: unknown) => void;
  clearDragState: () => void;
}

// Create a separate store for surface detection state
export const useSurfaceStore = create<SurfaceState>((set) => ({
  currentHit: null,
  isDragging: false,
  draggedFixtureData: null,
  setCurrentHit: (hit) => set({ currentHit: hit }),
  setIsDragging: (isDragging) => set({ isDragging }),
  setDraggedFixtureData: (data) => set({ draggedFixtureData: data }),
  clearDragState: () => set({ currentHit: null, isDragging: false, draggedFixtureData: null })
})); 