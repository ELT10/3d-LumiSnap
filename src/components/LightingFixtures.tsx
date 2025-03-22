import React, { useRef, useEffect, useState } from 'react';
import { useSceneStore, LightFixture } from '../store/sceneStore';
import { useThree } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { IESLight } from '.';
import { useIESLoader } from '../hooks';
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
  scaleFactor: number;
  transformMode?: 'translate' | 'rotate' | 'scale';
}

const FixtureInstance = ({ 
  fixture, 
  isSelected, 
  onSelect, 
  onUpdate,
  scaleFactor,
  transformMode
}: FixtureInstanceProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const spotlightRef = useRef<THREE.SpotLight>(null);
  const spotlightTargetRef = useRef<THREE.Object3D>(new THREE.Object3D());
  const { camera, raycaster } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const [iesData, setIESData] = useState<any>(null);
  const { loadIESProfile } = useIESLoader();
  const [time, setTime] = useState(0);
  const orbitControlsRef = useThree(state => state.controls);
  
  // Apply the building-based scale factor and increase size if selected
  const baseScale = scaleFactor;
  // Only apply visual scale effect if not using transform controls
  const visualScale = isSelected && !transformMode ? baseScale * 1.2 : baseScale;
  
  // Adjust the light intensity based on the fixture's scale
  const scaledIntensity = fixture.intensity * 
    (isSelected ? 1.3 : 1.0) * 
    Math.max(1, scaleFactor) * 
    Math.max(0.5, fixture.scale.x); // Scale light intensity with fixture
  
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
  
  // Replace the existing effect for updating light properties with this simpler version
  useEffect(() => {
    // Update spotlight reference if available
    if (spotlightRef.current) {
      // Point the spotlight at the target
      spotlightRef.current.target = spotlightTargetRef.current;
      
      // Scale light properties with fixture scale
      const scaleValue = Math.max(0.5, fixture.scale.x); // Use x as reference but ensure minimum
      
      // Update spotlight properties - match the values used in the JSX
      spotlightRef.current.distance = 20 * scaleValue; // Match the 20 units in JSX
      spotlightRef.current.angle = Math.PI / 4; // Match the wider angle
      spotlightRef.current.penumbra = 0.3; // Match the penumbra value
      
      // Ensure intensity is not zero and double it for visibility
      spotlightRef.current.intensity = Math.max(0.5, scaledIntensity) * 2;
    }
  }, [fixture.scale, scaledIntensity]);
  
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
  
  // Handle transform control changes
  const handleTransformChange = () => {
    if (groupRef.current) {
      // Update position, rotation, scale in the store based on the ref
      const position = groupRef.current.position.clone();
      const rotation = new THREE.Euler().copy(groupRef.current.rotation);
      const scale = groupRef.current.scale.clone();
      
      onUpdate({ position, rotation, scale });
    }
  };
  
  // Animate the selected fixture
  useEffect(() => {
    if (isSelected && !transformMode) {
      const interval = setInterval(() => {
        setTime(prev => prev + 0.1);
      }, 50);
      
      return () => clearInterval(interval);
    }
  }, [isSelected, transformMode]);
  
  // Load IES profile data if available
  useEffect(() => {
    const loadIES = async () => {
      if (fixture.iesProfile) {
        try {
          const data = await loadIESProfile();
          setIESData(data);
        } catch (error) {
          console.error("Failed to load IES profile:", error);
        }
      }
    };
    
    loadIES();
  }, [fixture.iesProfile, loadIESProfile]);
  
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
      setIsDragging(true);
      
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
      setIsDragging(false);
      
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
          <mesh scale={[0.3 * baseScale, 0.3 * baseScale, 0.3 * baseScale]}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial 
              color={0xff7700} 
              transparent={true} 
              opacity={0.15 + 0.1 * Math.sin(time * 3)}
            />
          </mesh>
        )}
        
        {/* Light source - now properly scaled and oriented with the fixture */}
        {iesData ? (
          <IESLight 
            iesData={iesData}
            position={[0, 0, 0]}
            color={fixture.color} 
            intensity={scaledIntensity * 2} // Double the intensity for better visibility
            distance={20 * fixture.scale.x} // Increase the range
            castShadow={true} // Always enable shadows
            target={spotlightTargetRef.current}
          />
        ) : (
          <spotLight
            ref={spotlightRef}
            position={[0, 0, 0]}
            color={fixture.color}
            intensity={scaledIntensity * 2} // Double the intensity for better visibility
            angle={Math.PI / 4} // Wider angle for more coverage
            penumbra={0.3}
            distance={20 * fixture.scale.x} // Increase the range
            castShadow={true} // Always enable shadows
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
        )}
      </group>
      
      {/* Transform controls - only shown when fixture is selected and a transform mode is active */}
      {isSelected && transformMode && groupRef.current && (
        <TransformControls
          object={groupRef.current}
          mode={transformMode}
          size={0.8}
          onObjectChange={handleTransformChange}
          onMouseUp={handleTransformChange}
        />
      )}
    </>
  );
}; 