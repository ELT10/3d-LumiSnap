import * as THREE from 'three';
import { LightFixture } from '../store/sceneStore';

// Type for serialized fixture data that can be stored in localStorage
export interface SerializedFixture {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  intensity: number;
  color: string; // serialized as hex
  iesProfile: string | null;
  name: string;
  manufacturer: string;
}

// Project save data structure
export interface ProjectSave {
  id: string;
  name: string;
  date: string;
  fixtures: SerializedFixture[];
}

// Convert a fixture to a serializable object
export const serializeFixture = (fixture: LightFixture): SerializedFixture => {
  return {
    id: fixture.id,
    type: fixture.type,
    position: {
      x: fixture.position.x,
      y: fixture.position.y,
      z: fixture.position.z
    },
    rotation: {
      x: fixture.rotation.x,
      y: fixture.rotation.y,
      z: fixture.rotation.z
    },
    scale: {
      x: fixture.scale.x,
      y: fixture.scale.y,
      z: fixture.scale.z
    },
    intensity: fixture.intensity,
    color: '#' + fixture.color.getHexString(),
    iesProfile: fixture.iesProfile,
    name: fixture.name,
    manufacturer: fixture.manufacturer
  };
};

// Convert a serialized fixture back to a LightFixture object
export const deserializeFixture = (serialized: SerializedFixture): Omit<LightFixture, 'id'> => {
  return {
    type: serialized.type,
    position: new THREE.Vector3(
      serialized.position.x,
      serialized.position.y,
      serialized.position.z
    ),
    rotation: new THREE.Euler(
      serialized.rotation.x,
      serialized.rotation.y,
      serialized.rotation.z
    ),
    scale: new THREE.Vector3(
      serialized.scale.x,
      serialized.scale.y,
      serialized.scale.z
    ),
    intensity: serialized.intensity,
    color: new THREE.Color(serialized.color),
    iesProfile: serialized.iesProfile,
    name: serialized.name,
    manufacturer: serialized.manufacturer
  };
};

// Generate a storage key for a project
const getProjectKey = (projectName: string): string => {
  return `lighting-project-${projectName.toLowerCase().replace(/\s+/g, '-')}`;
};

// Save a project to localStorage
export const saveProject = (
  projectName: string,
  fixtures: LightFixture[]
): boolean => {
  if (!projectName.trim()) {
    console.error('Project name cannot be empty');
    return false;
  }

  try {
    // Create project data
    const projectData: ProjectSave = {
      id: Date.now().toString(),
      name: projectName,
      date: new Date().toISOString(),
      fixtures: fixtures.map(serializeFixture)
    };

    // Save to localStorage
    localStorage.setItem(
      getProjectKey(projectName),
      JSON.stringify(projectData)
    );

    return true;
  } catch (error) {
    console.error('Failed to save project:', error);
    return false;
  }
};

// Load a project from localStorage
export const loadProject = (projectName: string): SerializedFixture[] | null => {
  try {
    const savedData = localStorage.getItem(getProjectKey(projectName));
    
    if (!savedData) {
      console.error(`Project "${projectName}" not found`);
      return null;
    }
    
    const projectData: ProjectSave = JSON.parse(savedData);
    return projectData.fixtures;
  } catch (error) {
    console.error('Failed to load project:', error);
    return null;
  }
};

// Get all saved projects
export const getSavedProjects = (): { name: string; date: string }[] => {
  const projects: { name: string; date: string }[] = [];
  
  try {
    // Loop through all items in localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      // Check if this is a lighting project
      if (key && key.startsWith('lighting-project-')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}') as ProjectSave;
          projects.push({
            name: data.name,
            date: data.date
          });
        } catch (error) {
          console.warn('Invalid project data in localStorage:', key, error);
        }
      }
    }
    
    // Sort projects by date (most recent first)
    return projects.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    console.error('Error retrieving saved projects:', error);
    return [];
  }
};

// Delete a saved project
export const deleteProject = (projectName: string): boolean => {
  try {
    localStorage.removeItem(getProjectKey(projectName));
    return true;
  } catch (error) {
    console.error(`Failed to delete project "${projectName}":`, error);
    return false;
  }
}; 