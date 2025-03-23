import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../store/sceneStore';
import { DuplicationManager } from '../utils/duplicationManager';
import DuplicationRayIndicator from './DuplicationRayIndicator';

/**
 * Component that renders a preview of the fixture being duplicated
 */
const DuplicationPreview: React.FC = () => {
  const { camera, scene } = useThree();
  const isDuplicating = useSceneStore(state => state.isDuplicating);
  const copiedFixtureId = useSceneStore(state => state.copiedFixtureId);
  const lightFixtures = useSceneStore(state => state.lightFixtures);
  const previewRef = useRef<THREE.Group>(null);
  const duplicationManager = DuplicationManager.getInstance();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [originalTransform, setOriginalTransform] = useState<any>(null);
  const [rayInfo, setRayInfo] = useState<{
    endPosition: THREE.Vector3,
    normal: THREE.Vector3,
    surfaceType: string
  } | null>(null);
  
  // Track mouse position globally
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  // Initialize the duplication manager with camera and scene
  useEffect(() => {
    duplicationManager.setCamera(camera);
    duplicationManager.setScene(scene);
    console.log("Duplication preview: Camera and scene set");
  }, [camera, scene]);
  
  // Store original fixture transform when starting duplication
  useEffect(() => {
    if (isDuplicating && copiedFixtureId) {
      const originalFixture = duplicationManager.getOriginalFixture();
      if (originalFixture) {
        setOriginalTransform(originalFixture);
        console.log("Using original transform:", originalFixture);
      }
    }
  }, [isDuplicating, copiedFixtureId]);
  
  // Clone the copied fixture as a preview when duplication starts
  useEffect(() => {
    if (!isDuplicating || !copiedFixtureId || !previewRef.current) return;
    
    console.log("Paste preview active, creating preview for fixture:", copiedFixtureId);
    
    // Find the original fixture
    const fixture = lightFixtures.find(f => f.id === copiedFixtureId);
    if (!fixture) {
      console.error("Could not find fixture with ID:", copiedFixtureId);
      return;
    }
    
    // Clear any existing children
    while (previewRef.current.children.length > 0) {
      previewRef.current.remove(previewRef.current.children[0]);
    }
    
    // Find all fixture objects in the scene to iterate through them
    const fixtureObjects: THREE.Object3D[] = [];
    scene.traverse((object) => {
      if (object.userData?.fixtureId === copiedFixtureId) {
        fixtureObjects.push(object);
      }
    });
    
    if (fixtureObjects.length === 0) {
      console.error("No fixture objects found with ID:", copiedFixtureId);
      return;
    }
    
    console.log(`Found ${fixtureObjects.length} fixture objects to clone`);
    
    // Clone each fixture object
    for (const object of fixtureObjects) {
      console.log("Cloning fixture object:", object);
      
      // Clone the object
      const clone = object.clone();
      
      // Apply semi-transparent material for preview
      clone.traverse((child: any) => {
        // Skip non-mesh objects
        if (!child.isMesh) return;
        
        try {
          // Handle array of materials
          if (Array.isArray(child.material)) {
            child.material = child.material.map((mat: THREE.Material) => {
              const newMat = mat.clone();
              newMat.transparent = true;
              newMat.opacity = 0.5; // More transparent for better visibility
              newMat.depthWrite = false; // Prevent depth-sorting issues
              newMat.needsUpdate = true;
              
              // Add blue tint to indicate preview
              if (newMat instanceof THREE.MeshStandardMaterial || 
                  newMat instanceof THREE.MeshPhongMaterial || 
                  newMat instanceof THREE.MeshLambertMaterial) {
                newMat.emissive = new THREE.Color(0x0077ff);
                newMat.emissiveIntensity = 0.3;
              }
              
              return newMat;
            });
          } 
          // Handle single material
          else if (child.material) {
            const newMat = child.material.clone();
            newMat.transparent = true;
            newMat.opacity = 0.5;
            newMat.depthWrite = false;
            newMat.needsUpdate = true;
            
            // Add blue tint to indicate preview
            if (newMat instanceof THREE.MeshStandardMaterial || 
                newMat instanceof THREE.MeshPhongMaterial || 
                newMat instanceof THREE.MeshLambertMaterial) {
              newMat.emissive = new THREE.Color(0x0077ff);
              newMat.emissiveIntensity = 0.3;
            }
            
            child.material = newMat;
          }
        } catch (error) {
          console.error("Error applying transparent material:", error);
        }
      });
      
      // Add to preview group
      if (previewRef.current) {
        previewRef.current.add(clone);
        console.log("Added clone to preview group");
      }
    }
    
    // Apply original rotation to preview
    if (originalTransform && previewRef.current) {
      // We only update position in updatePreviewPosition - keep original rotation
      previewRef.current.rotation.set(
        originalTransform.rotation.x,
        originalTransform.rotation.y,
        originalTransform.rotation.z,
        originalTransform.rotation.order
      );
      
      // Log the initial rotation
      console.log("Applied original rotation to preview:", 
        previewRef.current.rotation.x.toFixed(2),
        previewRef.current.rotation.y.toFixed(2),
        previewRef.current.rotation.z.toFixed(2)
      );
    }
  }, [isDuplicating, copiedFixtureId, lightFixtures, scene, originalTransform]);
  
  // Update position during duplication - keep original rotation
  useFrame(() => {
    if (!isDuplicating || !previewRef.current) return;
    
    // Update position based on mouse
    const position = duplicationManager.updatePreviewPosition(
      mousePosition.x, 
      mousePosition.y
    );
    
    // Get the current surface hit information for the ray
    const surfaceHit = duplicationManager.getCurrentSurfaceHit();
    
    if (position && previewRef.current) {
      // Update position only - keep the original rotation
      previewRef.current.position.copy(position);
      
      // Update ray information for the indicator
      if (surfaceHit) {
        setRayInfo({
          endPosition: position.clone(),
          normal: surfaceHit.normal.clone(),
          surfaceType: surfaceHit.surfaceType
        });
      }
      
      // Log position updates occasionally for debugging
      if (Math.random() < 0.02) {
        console.log("Preview position updated:", position.toArray());
      }
    }
  });
  
  // Debug when duplication state changes
  useEffect(() => {
    console.log("Paste preview state changed:", isDuplicating);
  }, [isDuplicating]);
  
  if (!isDuplicating) return null;
  
  return (
    <>
      {/* The fixture preview */}
      <group ref={previewRef}>
        {/* The preview clone will be added here */}
      </group>
      
      {/* Ray indicator */}
      {rayInfo && originalTransform && (
        <DuplicationRayIndicator
          startPosition={originalTransform.position}
          endPosition={rayInfo.endPosition}
          normal={rayInfo.normal}
          surfaceType={rayInfo.surfaceType}
        />
      )}
    </>
  );
};

export default DuplicationPreview; 