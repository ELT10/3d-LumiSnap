import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSceneStore, LightFixture } from '../store/sceneStore';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { IESLight } from '.';
import { useIESLoader, IESData } from '../hooks';
import { calculateFixtureScaleFactor } from '../utils/scalingUtils';
import './LightingFixtures.css';

interface LightingFixturesProps {
  transformMode: 'translate' | 'rotate' | 'scale';
}

export const LightingFixtures: React.FC<LightingFixturesProps> = ({ transformMode }) => {
  const lightFixtures = useSceneStore(state => state.lightFixtures);
  const selectedFixtureId = useSceneStore(state => state.selectedFixtureId);
  const selectFixture = useSceneStore(state => state.selectFixture);
  const updateFixture = useSceneStore(state => state.updateFixture);
  const buildingModelLoaded = useSceneStore(state => state.buildingModelLoaded);
  const setGlobalDragging = useSceneStore(state => state.setDragging);
  const setTransforming = useSceneStore(state => state.setTransforming);
  const { scene } = useThree();
  const [scaleFactor, setScaleFactor] = useState(1.0);
  
  // Calculate scaling factor based on building size
  useEffect(() => {
    if (buildingModelLoaded) {
      // Find building objects in the scene
      const buildingObjects: THREE.Object3D[] = [];
      scene.traverse(object => {
        if (object.userData?.type === 'building') {
          buildingObjects.push(object);
        }
      });
      
      // If we found building objects, create a group containing all building parts
      if (buildingObjects.length > 0) {
        const buildingGroup = new THREE.Group();
        buildingObjects.forEach(object => {
          // Create clones to avoid modifying the original objects
          const clone = object.clone();
          // Reset position and rotation to ensure proper bounding box calculation
          clone.position.set(0, 0, 0);
          clone.rotation.set(0, 0, 0);
          buildingGroup.add(clone);
        });
        
        // Calculate scale factor based on the building group size
        const calculatedFactor = calculateFixtureScaleFactor(buildingGroup, {
          desiredRelativeSize: 0.015, // Adjust this value as needed
          minScaleFactor: 0.5,
          maxScaleFactor: 2.0
        });
        
        setScaleFactor(calculatedFactor);
        
        // Clean up
        buildingGroup.children.forEach(child => buildingGroup.remove(child));
      }
    }
  }, [buildingModelLoaded, scene]);
  
  return (
    <group>
      {lightFixtures.map(fixture => (
        <FixtureInstance 
          key={fixture.id} 
          fixture={fixture} 
          isSelected={fixture.id === selectedFixtureId}
          onSelect={() => selectFixture(fixture.id)} 
          onUpdate={(updates) => updateFixture(fixture.id, updates)}
          setGlobalDragging={setGlobalDragging}
          setTransforming={setTransforming}
          scaleFactor={scaleFactor}
          transformMode={selectedFixtureId === fixture.id ? transformMode : undefined}
        />
      ))}
    </group>
  );
};

interface FixtureInstanceProps {
  fixture: LightFixture;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<Omit<LightFixture, 'id'>>) => void;
  setGlobalDragging: (isDragging: boolean) => void;
  setTransforming: (isTransforming: boolean) => void;
  scaleFactor: number;
  transformMode?: 'translate' | 'rotate' | 'scale';
}

const FixtureInstance = ({ 
  fixture, 
  isSelected, 
  onSelect, 
  onUpdate,
  setGlobalDragging,
  setTransforming,
  scaleFactor,
  transformMode
}: FixtureInstanceProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const spotlightRef = useRef<THREE.SpotLight>(null);
  const spotlightTargetRef = useRef<THREE.Object3D>(new THREE.Object3D());
  const { camera, raycaster } = useThree();
  // Use local state to track UI state, but sync with global state for history
  const [isDragging, setLocalDragging] = useState(false);
  const [iesData, setIESData] = useState<IESData | null>(null);
  const [isLoadingIES, setIsLoadingIES] = useState(false);
  const { loadIESProfile } = useIESLoader();
  const [time, setTime] = useState(0);
  const orbitControlsRef = useThree(state => state.controls);
  const [isActuallyTransforming, setIsActuallyTransforming] = useState(false);
  const transformingTimerRef = useRef<number | null>(null);
  
  // Load IES profile data when the component mounts or when the profile changes
  useEffect(() => {
    if (!fixture.iesProfile) return;
    
    setIsLoadingIES(true);
    
    loadIESProfile(fixture.iesProfile)
      .then((data) => {
        setIESData(data);
        console.log(`Loaded IES profile for ${fixture.name}: `, data);
      })
      .catch((error) => {
        console.error(`Failed to load IES profile ${fixture.iesProfile}:`, error);
      })
      .finally(() => {
        setIsLoadingIES(false);
      });
  }, [fixture.iesProfile, loadIESProfile]);
  
  // Sync local dragging state with global state
  useEffect(() => {
    setGlobalDragging(isDragging);
  }, [isDragging, setGlobalDragging]);
  
  // Apply the building-based scale factor and increase size if selected
  const baseScale = scaleFactor;
  // Only apply visual scale effect if not using transform controls
  const visualScale = isSelected && !transformMode ? baseScale * 1.2 : baseScale;
  
  // Adjust the light intensity based on the fixture's scale
  const scaledIntensity = fixture.intensity * 
    (isSelected ? 1.3 : 1.0) * 
    Math.max(1, scaleFactor) * 
    Math.max(0.5, fixture.scale.x);
  
  // Determine light parameters based on fixture type
  const getLightParameters = useCallback(() => {
    // Default parameters
    const defaults = {
      angle: Math.PI / 4,
      penumbra: 0.3,
      distance: 20 * Math.max(0.5, fixture.scale.x),
      decay: 2
    };
    
    // Apply type-specific parameters
    switch(fixture.type) {
      case 'spotlight':
        return {
          ...defaults,
          angle: Math.PI / 6, // Narrower beam
          penumbra: 0.2, // Sharper edge
          distance: 25 * Math.max(0.5, fixture.scale.x)
        };
      case 'grazer':
        return {
          ...defaults,
          angle: Math.PI / 8, // Very narrow beam
          penumbra: 0.1, // Very sharp edge
          distance: 15 * Math.max(0.5, fixture.scale.x)
        };
      case 'wallLight':
        return {
          ...defaults,
          angle: Math.PI / 3, // Wider beam
          penumbra: 0.5, // Softer edge
          distance: 10 * Math.max(0.5, fixture.scale.x)
        };
      case 'pendant':
        return {
          ...defaults,
          angle: Math.PI / 2, // Very wide beam
          penumbra: 0.4, // Medium edge softness
          distance: 15 * Math.max(0.5, fixture.scale.x)
        };
      default:
        return defaults;
    }
  }, [fixture.type, fixture.scale.x]);
  
  // Get the light parameters based on fixture type
  const lightParams = getLightParameters();
  
  // Initialize spotlight target
  useEffect(() => {
    // Create the target object if needed
    if (!spotlightTargetRef.current) {
      spotlightTargetRef.current = new THREE.Object3D();
    }
    
    // Position the target in front of the fixture (in local space)
    // Use a longer distance to make the direction more obvious
    spotlightTargetRef.current.position.set(0, 0, -10);
    
    // Add the target to the group so it moves with the fixture
    if (groupRef.current && !spotlightTargetRef.current.parent) {
      groupRef.current.add(spotlightTargetRef.current);
    }
    
    return () => {
      // Clean up target when component unmounts
      if (spotlightTargetRef.current.parent) {
        spotlightTargetRef.current.parent.remove(spotlightTargetRef.current);
      }
    };
  }, []);
  
  // Disable orbit controls when using transform controls
  useEffect(() => {
    if (orbitControlsRef && isSelected && transformMode) {
      const controls = orbitControlsRef as any;
      controls.enabled = false;
      return () => {
        controls.enabled = true;
      };
    }
  }, [orbitControlsRef, isSelected, transformMode]);
  
  // Improved transform handlers with debounce
  const handleTransformMouseDown = useCallback(() => {
    // Clear any existing timer
    if (transformingTimerRef.current) {
      clearTimeout(transformingTimerRef.current);
      transformingTimerRef.current = null;
    }
    
    // Only set transforming if it's an actual user interaction (not just hover)
    setIsActuallyTransforming(true);
    setTransforming(true);
  }, [setTransforming]);
  
  const handleTransformMouseUp = useCallback(() => {
    if (isActuallyTransforming) {
      // Use a short delay to ensure all transform events are processed
      transformingTimerRef.current = setTimeout(() => {
        setTransforming(false);
        setIsActuallyTransforming(false);
      }, 100);
    }
  }, [isActuallyTransforming, setTransforming]);
  
  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (transformingTimerRef.current) {
        clearTimeout(transformingTimerRef.current);
      }
    };
  }, []);
  
  // Handle transform control changes - with debouncing
  const handleTransformChange = useCallback(() => {
    if (!groupRef.current || !isActuallyTransforming) return;
    
    // Update position, rotation, scale in the store based on the ref
    const position = groupRef.current.position.clone();
    const rotation = new THREE.Euler().copy(groupRef.current.rotation);
    const scale = groupRef.current.scale.clone();
    
    onUpdate({ position, rotation, scale });
  }, [isActuallyTransforming, onUpdate]);
  
  // Animate the selected fixture
  useEffect(() => {
    if (isSelected && !transformMode) {
      const interval = setInterval(() => {
        setTime(prev => prev + 0.1);
      }, 50);
      
      return () => clearInterval(interval);
    }
  }, [isSelected, transformMode]);
  
  // Handle selection click
  const handleFixtureClick = (e: any) => {
    e.stopPropagation();
    // Prevent event from reaching the background
    e.nativeEvent.stopPropagation();
    onSelect();
  };
  
  // Handle dragging - only used when transform controls are not active
  const handlePointerDown = (e: any) => {
    if (isSelected && !transformMode) {
      e.stopPropagation();
      setLocalDragging(true);
      
      // Set pointer capture on the DOM element
      (e.target as any).setPointerCapture(e.pointerId);
    }
  };
  
  const handlePointerMove = (e: any) => {
    if (!isDragging || !groupRef.current || transformMode) return;
    
    e.stopPropagation();
    
    // Convert mouse position to normalized device coordinates
    const mouse = new THREE.Vector2(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    
    // Update the raycaster with the mouse position and camera
    raycaster.setFromCamera(mouse, camera);
    
    // Create a plane parallel to the camera at the fixture's current height
    const planeNormal = new THREE.Vector3(0, 1, 0);
    const plane = new THREE.Plane(planeNormal, -fixture.position.y);
    
    // Find the intersection point
    const intersectionPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
      // Update the fixture position
      onUpdate({ position: intersectionPoint });
    }
  };
  
  const handlePointerUp = (e: any) => {
    if (isDragging) {
      e.stopPropagation();
      setLocalDragging(false);
      
      // Release pointer capture
      if (e.target) {
        (e.target as any).releasePointerCapture(e.pointerId);
      }
    }
  };
  
  // Calculate a pulsing value for the selected fixture
  const pulseValue = isSelected && !transformMode
    ? 0.8 + 0.4 * Math.sin(time * 3) 
    : 0.5;
  
  // Enhanced glow for selected fixtures
  const emissiveColor = isSelected 
    ? new THREE.Color(0xff7700).multiplyScalar(pulseValue)
    : fixture.color.clone().multiplyScalar(0.3);
  
  // Return JSX with TransformControls
  return (
    <>
      <group 
        ref={groupRef}
        position={[fixture.position.x, fixture.position.y, fixture.position.z]}
        rotation={[fixture.rotation.x, fixture.rotation.y, fixture.rotation.z]}
        scale={[fixture.scale.x, fixture.scale.y, fixture.scale.z]}
        onClick={handleFixtureClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        userData={{ type: 'fixture' }}
      >
        {/* Visual representation of the fixture */}
        <mesh 
          castShadow 
          userData={{ type: 'fixture' }} 
          scale={visualScale}
        >
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshStandardMaterial 
            color={isSelected ? 0xff7700 : 0xffffff} 
            emissive={emissiveColor}
            emissiveIntensity={isSelected ? 1.0 : 0.5}
            roughness={0.3}
            metalness={0.5}
          />
        </mesh>
        
        {/* Add a glow sphere around selected fixtures */}
        {isSelected && !transformMode && (
          <mesh scale={visualScale * 1.4}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial 
              color={0xff7700} 
              transparent 
              opacity={0.15} 
              depthWrite={false}
            />
          </mesh>
        )}
        
        {/* Use IES Light when IES data is available */}
        {iesData ? (
          <IESLight 
            iesData={iesData}
            position={[0, 0, 0]}
            color={fixture.color}
            intensity={scaledIntensity}
            distance={lightParams.distance}
            castShadow={true}
            shadowMapSize={1024}
            target={spotlightTargetRef.current}
          />
        ) : (
          /* Fallback spotlight when IES data is not available or still loading */
          <spotLight 
            ref={spotlightRef}
            position={[0, 0, 0]}
            color={fixture.color}
            intensity={scaledIntensity}
            distance={lightParams.distance}
            angle={lightParams.angle}
            penumbra={lightParams.penumbra}
            decay={lightParams.decay}
            castShadow
            target={spotlightTargetRef.current}
          />
        )}
        
        {/* Optional visual indicator for light direction */}
        {isSelected && (
          <mesh position={[0, 0, -1]} scale={[0.05, 0.05, 2]}>
            <boxGeometry />
            <meshBasicMaterial color={0xffff00} transparent opacity={0.3} />
          </mesh>
        )}
      </group>

      {/* Transform controls - only shown when fixture is selected and a transform mode is active */}
      {isSelected && transformMode && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode={transformMode}
          size={0.5}
          onChange={handleTransformChange}
          onMouseDown={handleTransformMouseDown}
          onMouseUp={handleTransformMouseUp}
          onObjectChange={handleTransformChange}
        />
      )}
    </>
  );
}; 