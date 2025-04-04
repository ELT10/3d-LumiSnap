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

// Represent a history entry for undo/redo
type HistoryEntry = {
  lightFixtures: LightFixture[];
  selectedFixtureId: string | null;
};

type SceneState = {
  lightFixtures: LightFixture[];
  selectedFixtureId: string | null;
  copiedFixtureId: string | null; // Store which fixture was copied
  isDragging: boolean;
  isTransforming: boolean; // Add new state to track transform control interaction
  buildingModelLoaded: boolean;
  isDuplicating: boolean; // Track when duplication is in process
  fixturesVisible: boolean; // Track if fixture 3D objects should be visible
  
  // History stacks for undo/redo
  history: HistoryEntry[];
  historyIndex: number;
  
  // Actions
  addFixture: (fixture: Omit<LightFixture, 'id'>) => void;
  removeFixture: (id: string) => void;
  updateFixture: (id: string, updates: Partial<Omit<LightFixture, 'id'>>) => void;
  selectFixture: (id: string | null) => void;
  copyFixture: (id: string | null) => void; // Copy a fixture
  pasteFixture: (position?: THREE.Vector3, rotation?: THREE.Euler) => string | null; // Paste the copied fixture
  setDragging: (isDragging: boolean) => void;
  setTransforming: (isTransforming: boolean) => void; // New action for transform control state
  setBuildingModelLoaded: (loaded: boolean) => void;
  clearFixtures: () => void;
  duplicateFixture: (id: string, position?: THREE.Vector3, rotation?: THREE.Euler) => string | null; // New action to duplicate a fixture
  setDuplicating: (isDuplicating: boolean) => void; // Track duplication state
  toggleFixturesVisibility: () => void; // Toggle visibility of fixture 3D objects
  
  // History actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushToHistory: () => void;
  
  // Helpers
  repositionSampleFixture: () => void; // New action to reposition the sample fixture after building loads
};

export const useSceneStore = create<SceneState>((set, get) => ({
  lightFixtures: [],
  selectedFixtureId: null,
  copiedFixtureId: null,
  isDragging: false,
  isTransforming: false,
  buildingModelLoaded: false,
  isDuplicating: false,
  fixturesVisible: true, // Fixtures are visible by default
  
  // Initialize history with the initial state
  history: [],
  historyIndex: -1,

  // Helper function to push current state to history
  pushToHistory: () => {
    const state = get();
    
    // Skip if we're in the middle of a drag or transform operation
    if (state.isDragging || state.isTransforming) return;
    
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    const newEntry = {
      lightFixtures: JSON.parse(JSON.stringify(state.lightFixtures.map(fixture => ({
        ...fixture,
        position: { x: fixture.position.x, y: fixture.position.y, z: fixture.position.z },
        rotation: { x: fixture.rotation.x, y: fixture.rotation.y, z: fixture.rotation.z },
        scale: { x: fixture.scale.x, y: fixture.scale.y, z: fixture.scale.z },
        color: { r: fixture.color.r, g: fixture.color.g, b: fixture.color.b }
      })))),
      selectedFixtureId: state.selectedFixtureId
    };
    
    // Don't push identical states
    const currentState = newHistory[state.historyIndex];
    if (currentState && JSON.stringify(currentState) === JSON.stringify(newEntry)) {
      return;
    }
    
    newHistory.push(newEntry);
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  },

  // Actions
  addFixture: (fixture) => {
    // We need to push the new state AFTER adding the fixture, not before
    set((state) => {
      const newFixture = { 
        ...fixture, 
        id: Math.random().toString(36).substring(2, 9) 
      };
      
      return {
        lightFixtures: [...state.lightFixtures, newFixture]
      };
    });
    
    // Push to history after the state has been updated
    // Use setTimeout to ensure this runs after the state update is complete
    setTimeout(() => {
      get().pushToHistory();
    }, 0);
  },

  removeFixture: (id) => {
    // Apply the change first
    set((state) => ({
      lightFixtures: state.lightFixtures.filter(fixture => fixture.id !== id),
      selectedFixtureId: state.selectedFixtureId === id ? null : state.selectedFixtureId
    }));
    
    // Then push to history after the state has been updated
    setTimeout(() => {
      get().pushToHistory();
    }, 0);
  },

  updateFixture: (id, updates) => {
    const state = get();
    
    // Only push to history if we're not in the middle of a drag or transform operation
    // This prevents storing every small position update during dragging
    if (!state.isDragging && !state.isTransforming) {
      get().pushToHistory();
    }
    
    set((state) => ({
      lightFixtures: state.lightFixtures.map(fixture => 
        fixture.id === id ? { ...fixture, ...updates } : fixture
      )
    }));
  },

  // Selecting a fixture should not create history entries
  selectFixture: (id) => set({ selectedFixtureId: id }),
  
  setDragging: (isDragging) => {
    const prevDragging = get().isDragging;
    
    // If starting to drag, save the initial state
    if (!prevDragging && isDragging) {
      get().pushToHistory();
    }
    // If ending a drag, save the final state
    else if (prevDragging && !isDragging) {
      // Small delay to ensure the final position is recorded
      setTimeout(() => {
        get().pushToHistory();
      }, 0);
    }
    
    set({ isDragging });
  },
  
  // New action to handle transform control interaction state
  setTransforming: (isTransforming) => {
    const prevTransforming = get().isTransforming;
    
    // If starting to transform, save the initial state
    if (!prevTransforming && isTransforming) {
      get().pushToHistory();
    }
    // If ending a transform, save the final state
    else if (prevTransforming && !isTransforming) {
      // Small delay to ensure the final position is recorded
      setTimeout(() => {
        get().pushToHistory();
      }, 0);
    }
    
    set({ isTransforming });
  },
  
  setBuildingModelLoaded: (loaded) => set({ buildingModelLoaded: loaded }),
  
  // Clear all fixtures and push to history
  clearFixtures: () => {
    // Apply the change first
    set({ 
      lightFixtures: [],
      selectedFixtureId: null
    });
    
    // Then push to history after the state has been updated
    setTimeout(() => {
      get().pushToHistory();
    }, 0);
  },
  
  // Duplicate an existing fixture
  duplicateFixture: (id, position, rotation) => {
    const state = get();
    const fixture = state.lightFixtures.find(f => f.id === id);
    
    if (!fixture) return null;
    
    console.log("Duplicating fixture with ID:", id);
    console.log("Original position:", fixture.position);
    console.log("Original rotation:", fixture.rotation);
    
    if (position) console.log("New position:", position);
    if (rotation) console.log("New rotation:", rotation);
    
    // Create a deep copy of the fixture with a new ID
    const newFixture: LightFixture = {
      ...fixture,
      id: Math.random().toString(36).substring(2, 9),
      name: `${fixture.name} (copy)`,
      // Ensure position is properly copied
      position: position ? 
        new THREE.Vector3(position.x, position.y, position.z) : 
        new THREE.Vector3(
          fixture.position.x + 0.5,
          fixture.position.y,
          fixture.position.z + 0.5
        ),
      // Ensure rotation is properly copied
      rotation: rotation ? 
        new THREE.Euler(rotation.x, rotation.y, rotation.z, rotation.order) : 
        new THREE.Euler(fixture.rotation.x, fixture.rotation.y, fixture.rotation.z, fixture.rotation.order),
      // Ensure scale is properly copied
      scale: new THREE.Vector3(fixture.scale.x, fixture.scale.y, fixture.scale.z),
      // Ensure color is properly copied
      color: new THREE.Color(fixture.color.r, fixture.color.g, fixture.color.b),
    };
    
    console.log("Created new fixture:", newFixture);
    
    // Add the duplicated fixture
    set(state => ({
      lightFixtures: [...state.lightFixtures, newFixture]
    }));
    
    // Select the new fixture
    set({ selectedFixtureId: newFixture.id });
    
    // Push to history after the state has been updated
    setTimeout(() => {
      get().pushToHistory();
    }, 0);
    
    return newFixture.id;
  },
  
  // Track duplication state
  setDuplicating: (isDuplicating) => set({ isDuplicating }),
  
  // Copy a fixture to store for later pasting
  copyFixture: (id) => {
    console.log("Copying fixture:", id);
    set({ copiedFixtureId: id });
  },
  
  // Paste the copied fixture at the given position
  pasteFixture: (position, rotation) => {
    const state = get();
    const copiedId = state.copiedFixtureId;
    
    if (!copiedId) {
      console.warn("Cannot paste: No fixture has been copied");
      return null;
    }
    
    // Use the existing duplicateFixture function
    return state.duplicateFixture(copiedId, position, rotation);
  },
  
  // Toggle fixtures visibility
  toggleFixturesVisibility: () => {
    set(state => ({
      fixturesVisible: !state.fixturesVisible
    }));
  },
  
  // Undo action
  undo: () => {
    const state = get();
    if (!state.canUndo()) return;
    
    const prevState = state.history[state.historyIndex - 1];
    
    set({
      historyIndex: state.historyIndex - 1,
      lightFixtures: prevState.lightFixtures.map(fixture => ({
        ...fixture,
        position: new THREE.Vector3(fixture.position.x, fixture.position.y, fixture.position.z),
        rotation: new THREE.Euler(fixture.rotation.x, fixture.rotation.y, fixture.rotation.z),
        scale: new THREE.Vector3(fixture.scale.x, fixture.scale.y, fixture.scale.z),
        color: new THREE.Color(fixture.color.r, fixture.color.g, fixture.color.b)
      })),
      selectedFixtureId: prevState.selectedFixtureId
    });
  },
  
  // Redo action
  redo: () => {
    const state = get();
    if (!state.canRedo()) return;
    
    const nextState = state.history[state.historyIndex + 1];
    
    set({
      historyIndex: state.historyIndex + 1,
      lightFixtures: nextState.lightFixtures.map(fixture => ({
        ...fixture,
        position: new THREE.Vector3(fixture.position.x, fixture.position.y, fixture.position.z),
        rotation: new THREE.Euler(fixture.rotation.x, fixture.rotation.y, fixture.rotation.z),
        scale: new THREE.Vector3(fixture.scale.x, fixture.scale.y, fixture.scale.z),
        color: new THREE.Color(fixture.color.r, fixture.color.g, fixture.color.b)
      })),
      selectedFixtureId: nextState.selectedFixtureId
    });
  },
  
  // Check if undo is available
  canUndo: () => {
    const state = get();
    return state.historyIndex > 0;
  },
  
  // Check if redo is available
  canRedo: () => {
    const state = get();
    return state.historyIndex < state.history.length - 1;
  },
  
  // Helper to reposition the sample fixture after building is loaded
  repositionSampleFixture: () => {
    // No need to do anything since we're not using sample fixtures anymore
  }
}));

// Initialize the history with the initial state
useSceneStore.getState().pushToHistory(); 