import { create } from 'zustand';
import * as THREE from 'three';

// Define the types for our surface store
interface SurfaceState {
  currentHit: {
    position: THREE.Vector3;
    normal: THREE.Vector3;
    surfaceType: string;
    distance: number;
    object: THREE.Object3D;
    rotation: THREE.Euler;
  } | null;
  isDragging: boolean;
  draggedFixtureData: any;
  setCurrentHit: (hit: any) => void;
  setIsDragging: (isDragging: boolean) => void;
  setDraggedFixtureData: (data: any) => void;
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