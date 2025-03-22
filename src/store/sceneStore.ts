import { create } from 'zustand';
import * as THREE from 'three';

export type LightFixture = {
  id: string;
  type: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  intensity: number;
  color: THREE.Color;
  iesProfile: string | null;
  name: string;
  manufacturer: string;
};

type SceneState = {
  lightFixtures: LightFixture[];
  selectedFixtureId: string | null;
  isDragging: boolean;
  buildingModelLoaded: boolean;
  
  // Actions
  addFixture: (fixture: Omit<LightFixture, 'id'>) => void;
  removeFixture: (id: string) => void;
  updateFixture: (id: string, updates: Partial<Omit<LightFixture, 'id'>>) => void;
  selectFixture: (id: string | null) => void;
  setDragging: (isDragging: boolean) => void;
  setBuildingModelLoaded: (loaded: boolean) => void;
};

export const useSceneStore = create<SceneState>((set) => ({
  lightFixtures: [
    {
      id: "sample1",
      type: "spotlight",
      position: new THREE.Vector3(0, 3, 0),
      rotation: new THREE.Euler(0, 0, 0),
      scale: new THREE.Vector3(1, 1, 1),
      intensity: 1.5,
      color: new THREE.Color(0xffffff),
      iesProfile: "/ies/spot.ies",
      name: "Sample Light",
      manufacturer: "Demo"
    }
  ],
  selectedFixtureId: null,
  isDragging: false,
  buildingModelLoaded: false,

  // Actions
  addFixture: (fixture) => set((state) => ({
    lightFixtures: [
      ...state.lightFixtures,
      { ...fixture, id: Math.random().toString(36).substring(2, 9) }
    ]
  })),

  removeFixture: (id) => set((state) => ({
    lightFixtures: state.lightFixtures.filter(fixture => fixture.id !== id),
    selectedFixtureId: state.selectedFixtureId === id ? null : state.selectedFixtureId
  })),

  updateFixture: (id, updates) => set((state) => ({
    lightFixtures: state.lightFixtures.map(fixture => 
      fixture.id === id ? { ...fixture, ...updates } : fixture
    )
  })),

  selectFixture: (id) => set({ selectedFixtureId: id }),
  
  setDragging: (isDragging) => set({ isDragging }),
  
  setBuildingModelLoaded: (loaded) => set({ buildingModelLoaded: loaded })
})); 