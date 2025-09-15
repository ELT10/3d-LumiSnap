import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';

interface MediaFacadeProps {
  videoSrc: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  intensity: number;
  opacity: number;
  active: boolean;
  // Panel-specific properties
  panelSize: number;
  panelGap: number;
  panelResolution: number; // Number of panels per row/column
}

export const MediaFacade: React.FC<MediaFacadeProps> = ({
  videoSrc,
  position,
  rotation,
  scale,
  intensity,
  opacity,
  active,
  panelSize = 0.05, // Default 5cm panels
  panelGap = 0.005, // Default 5mm gap
  panelResolution = 32, // Default 32x32 panel grid
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  // Add debug mode to make panels visible even without video
  const DEBUG_MODE = false; // Set to false to hide debug visualizations
  
  // Create video element and texture
  useEffect(() => {
    console.log('MediaFacade: Component mounted or videoSrc changed', { videoSrc, active });
    
    if (!videoSrc) {
      console.log('MediaFacade: No video source provided');
      return;
    }
    
    console.log('MediaFacade: Creating video element with source:', videoSrc);
    
    // Create video element with proper attributes
    const video = document.createElement('video');
    video.src = videoSrc;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true; // Needed for iOS
    video.autoplay = false; // Don't autoplay until we explicitly call play()
    video.preload = 'auto'; // Preload the video
    video.style.display = 'none';
    document.body.appendChild(video); // Add to DOM for iOS/Safari compatibility
    
    // Add event listeners for debugging
    video.addEventListener('canplay', () => {
      console.log('MediaFacade: Video can play event fired');
    });
    
    video.addEventListener('error', (e) => {
      console.error('MediaFacade: Video error event:', e);
    });
    
    video.addEventListener('loadedmetadata', () => {
      console.log('MediaFacade: Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
    });
    
    // Create video texture only after metadata is loaded
    const handleMetadataLoaded = () => {
      // Create video texture with proper settings
      const texture = new THREE.VideoTexture(video);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.format = THREE.RGBAFormat;
      texture.needsUpdate = true;
      
      // Store texture in state
      setVideoTexture(texture);
      setVideoElement(video);
      
      // Try to play the video if active
      if (active) {
        console.log('MediaFacade: Attempting to play video');
        playVideo(video);
      } else {
        console.log('MediaFacade: Video not active, not playing');
        video.pause();
      }
      
      // Remove the event listener
      video.removeEventListener('loadedmetadata', handleMetadataLoaded);
    };
    
    // Helper function to handle video playback with error handling
    const playVideo = (videoEl: HTMLVideoElement) => {
      const playPromise = videoEl.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('MediaFacade: Video playback started successfully');
          })
          .catch(err => {
            console.error('MediaFacade: Video play error:', err);
            
            // Try again with user interaction simulation
            setTimeout(() => {
              console.log('MediaFacade: Retrying video playback...');
              videoEl.play().catch(e => console.error('MediaFacade: Retry failed:', e));
            }, 1000);
          });
      }
    };
    
    // Add the loadedmetadata event listener
    video.addEventListener('loadedmetadata', handleMetadataLoaded);
    
    // If the video already has metadata loaded, call the handler directly
    if (video.readyState >= 2) {
      handleMetadataLoaded();
    }
    
    // Clean up
    return () => {
      console.log('MediaFacade: Cleaning up video resources');
      video.pause();
      video.removeEventListener('loadedmetadata', handleMetadataLoaded);
      video.removeEventListener('canplay', () => {});
      video.removeEventListener('error', () => {});
      video.src = '';
      video.load();
      video.remove();
      if (videoTexture) {
        videoTexture.dispose();
      }
    };
  }, [videoSrc, active]);
  
  // Update playback state when active changes
  useEffect(() => {
    if (!videoElement) return;
    
    if (active) {
      console.log('MediaFacade: Playback state changed to active, playing video');
      
      // Immediately set all panels to dark until video starts playing
      if (groupRef.current) {
        groupRef.current.children.forEach((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;
          
          const material = mesh.material as THREE.MeshBasicMaterial;
          material.color.setRGB(0, 0, 0); // Completely black
        });
      }
      
      videoElement.play().catch(err => console.error("Video play error:", err));
    } else {
      console.log('MediaFacade: Playback state changed to inactive, pausing video');
      videoElement.pause();
      
      // When paused, make panels completely black
      if (groupRef.current) {
        groupRef.current.children.forEach((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;
          
          const material = mesh.material as THREE.MeshBasicMaterial;
          material.color.setRGB(0, 0, 0); // Completely black
        });
      }
    }
  }, [active, videoElement]);
  
  // Generate panel geometry with rounded corners
  const panelGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(panelSize, panelSize);
    return geometry;
  }, [panelSize]);
  
  // Generate the panel grid using instances for performance
  const panelGrid = useMemo(() => {
    console.log('MediaFacade: Generating panel grid with:', { 
      panelSize, 
      panelGap, 
      panelResolution, 
      opacity 
    });
    
    // Calculate the total width and height of the facade
    const totalWidth = (panelSize + panelGap) * panelResolution - panelGap;
    
    // Generate a grid of panel positions
    const panels = [];
    
    // Create material that completely ignores scene lighting
    const material = new THREE.MeshBasicMaterial({
      color: DEBUG_MODE ? new THREE.Color(0xff0000) : new THREE.Color(0x000000), // Black (no light emission)
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
      toneMapped: false,
      wireframe: DEBUG_MODE,
      fog: false, // Disable fog interaction
      depthWrite: true, // Ensure proper depth sorting
      depthTest: true  // Ensure proper depth testing
    });
    
    // Create panels
    for (let y = 0; y < panelResolution; y++) {
      for (let x = 0; x < panelResolution; x++) {
        // Calculate panel position within grid
        const xPos = (x * (panelSize + panelGap)) - totalWidth/2 + panelSize/2;
        const yPos = (y * (panelSize + panelGap)) - totalWidth/2 + panelSize/2;
        
        panels.push({ x: xPos, y: yPos });
      }
    }
    
    console.log(`MediaFacade: Created ${panels.length} panels`);
    return { panels, material };
  }, [panelSize, panelGap, panelResolution, opacity, DEBUG_MODE]);
  
  // Update panel colors based on video texture
  useEffect(() => {
    if ((!videoTexture || !videoElement) && !DEBUG_MODE) return; // Skip if no video and not in debug mode
    if (!groupRef.current || panelGrid.panels.length === 0) return;
    
    // Set up an animation loop to sample the video
    const samplingCanvas = document.createElement('canvas');
    const samplingContext = samplingCanvas.getContext('2d');
    
    if (!samplingContext) return;
    
    // Set canvas size to match panel resolution for sampling
    samplingCanvas.width = panelResolution;
    samplingCanvas.height = panelResolution;
    
    // Create a pixel sampling function
    const sampleVideo = () => {
      // Only process if video is playing and active
      if (!videoElement || videoElement.paused || videoElement.ended || !active) {
        if (DEBUG_MODE) {
          // In debug mode, show rainbow pattern when video is not playing
          groupRef.current!.children.forEach((child, i) => {
            if (i >= panelResolution * panelResolution) return; // Skip the debug helpers
            
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;
            
            // Rainbow pattern that changes over time
            const hue = (Date.now() * 0.0001 + i * 0.01) % 1;
            const color = new THREE.Color().setHSL(hue, 1, 0.5);
            
            const material = mesh.material as THREE.MeshBasicMaterial;
            material.color.copy(color);
          });
        } else {
          // When no video is playing and not in debug mode,
          // set all panels to completely black with no emission
          groupRef.current!.children.forEach((child) => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;
            
            const material = mesh.material as THREE.MeshBasicMaterial;
            material.color.setRGB(0, 0, 0); // Completely black
          });
        }
        return;
      }
      
      try {
        // Draw the current video frame to our canvas, scaled to the panel resolution
        samplingContext.drawImage(
          videoElement, 
          0, 0, videoElement.videoWidth, videoElement.videoHeight,
          0, 0, panelResolution, panelResolution
        );
        
        // Get image data
        const imageData = samplingContext.getImageData(0, 0, panelResolution, panelResolution);
        const pixels = imageData.data;
        
        // Update each panel's color based on the sampled pixel
        groupRef.current!.children.forEach((child, i) => {
          const mesh = child as THREE.Mesh;
          // Skip if not a mesh
          if (!mesh.isMesh) return;
          
          // Make sure we're within bounds
          if (i >= panelResolution * panelResolution) return;
          
          // Calculate which pixel this panel corresponds to
          const x = i % panelResolution;
          const y = Math.floor(i / panelResolution);
          
          // Get the pixel data for this panel
          const pixelIndex = (y * panelResolution + x) * 4;
          
          // Ensure we have valid pixel data
          if (pixelIndex >= pixels.length - 3) return;
          
          const r = pixels[pixelIndex] / 255;
          const g = pixels[pixelIndex + 1] / 255;
          const b = pixels[pixelIndex + 2] / 255;
          
          // Update the panel's material color with proper intensity
          // Avoid pure white even at high intensity to prevent hotspots
          const material = mesh.material as THREE.MeshBasicMaterial;
          material.color.setRGB(
            Math.min(r * intensity, 0.95), 
            Math.min(g * intensity, 0.95), 
            Math.min(b * intensity, 0.95)
          );
        });
      } catch (err) {
        console.error('MediaFacade: Error sampling video:', err);
        // If we have an error, set all panels to black
        if (groupRef.current) {
          groupRef.current.children.forEach((child) => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;
            
            const material = mesh.material as THREE.MeshBasicMaterial;
            material.color.setRGB(0, 0, 0);
          });
        }
      }
    };
    
    // Set up animation loop
    let animationFrameId: number;
    const animate = () => {
      sampleVideo();
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Clean up
    return () => {
      cancelAnimationFrame(animationFrameId);
      samplingCanvas.remove();
    };
  }, [videoTexture, videoElement, active, intensity, panelGrid.panels, panelResolution, DEBUG_MODE]);
  
  // Create the panel meshes
  useEffect(() => {
    if (!groupRef.current) {
      console.log('MediaFacade: Group ref not available');
      return;
    }
    
    console.log('MediaFacade: Creating panel meshes');
    
    // Clear previous panels
    while (groupRef.current.children.length > 0) {
      const material = (groupRef.current.children[0] as THREE.Mesh).material as THREE.Material;
      if (material) material.dispose();
      groupRef.current.remove(groupRef.current.children[0]);
    }
    
    // Create panel meshes
    panelGrid.panels.forEach(panel => {
      const material = panelGrid.material.clone(); // Clone material so each panel can have its own color
      
      // Start with dark panels by default
      if (!DEBUG_MODE) {
        (material as THREE.MeshBasicMaterial).color.setRGB(0, 0, 0); // Completely black
      }
      
      const panelMesh = new THREE.Mesh(
        panelGeometry, 
        material
      );
      
      panelMesh.position.set(panel.x, panel.y, 0);
      groupRef.current!.add(panelMesh);
    });
    
    console.log(`MediaFacade: Added ${panelGrid.panels.length} panel meshes to the scene`);
  }, [panelGeometry, panelGrid, DEBUG_MODE]);
  
  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
      scale={[scale.x, scale.y, scale.z]}
    >
      {/* Add a solid black backing plane to block any light passing through */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[1.02, 1.02]} /> {/* Slightly larger than the panel grid */}
        <meshBasicMaterial 
          color={0x000000} 
          transparent={false} 
          side={THREE.DoubleSide}
          depthWrite={true}
        />
      </mesh>
    </group>
  );
}; 