import { useState, useCallback, useRef } from 'react';
import { IESLoader, IESData as BaseIESData } from '../utils/IESLoader';

// Extend the IESData interface to include beam and field angles
export interface IESData extends BaseIESData {
  beamAngle?: number; // The angle at which light intensity is 50% of max (narrower)
  fieldAngle?: number; // The angle at which light intensity is 10% of max (wider)
}

/**
 * React hook for loading and caching IES profile data
 * @returns Methods and state for loading IES profiles
 */
export const useIESLoader = () => {
  // Cache loaded profiles to avoid reloading the same files
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const profileCacheRef = useRef<Map<string, IESData>>(new Map());
  
  /**
   * Loads an IES profile from the specified URL
   * 
   * @param profilePath - Path to the IES file to load
   * @returns Promise that resolves with the parsed IES data
   */
  const loadIESProfile = useCallback(async (profilePath: string): Promise<IESData> => {
    // Check if the profile is already cached
    if (profileCacheRef.current.has(profilePath)) {
      return profileCacheRef.current.get(profilePath)!;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Create a new IES loader instance
      const loader = new IESLoader();
      
      // Load and parse the IES file
      const iesData = await new Promise<BaseIESData>((resolve, reject) => {
        loader.load(
          profilePath,
          (data) => resolve(data),
          undefined, // onProgress callback
          (err) => reject(err instanceof Error ? err : new Error(String(err)))
        );
      });
      
      // Convert to extended IESData
      const extendedData: IESData = {
        ...iesData,
      };
      
      // Add to cache for future use
      profileCacheRef.current.set(profilePath, extendedData);
      
      // Calculate beam and field angles if not already present
      const angles = calculateLightAngles(extendedData);
      if (angles) {
        extendedData.beamAngle = angles.beamAngle;
        extendedData.fieldAngle = angles.fieldAngle;
      }
      
      setLoading(false);
      return extendedData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setLoading(false);
      
      // Use fallback data in case of error
      console.error(`Error loading IES profile: ${profilePath}`, error);
      const fallbackData = createFallbackIESData(profilePath);
      return fallbackData;
    }
  }, []);
  
  /**
   * Clears the IES profile cache
   */
  const clearCache = useCallback(() => {
    profileCacheRef.current.clear();
  }, []);
  
  return {
    loadIESProfile,
    clearCache,
    loading,
    error
  };
};

/**
 * Calculates beam angle (50% of max intensity) and field angle (10% of max intensity)
 * from IES data
 * @param iesData - The IES profile data to analyze
 * @returns Object with beam and field angles in radians
 */
function calculateLightAngles(iesData: IESData): { beamAngle: number, fieldAngle: number } | null {
  try {
    // Get the vertical angles from the IES data
    const verticalAngles = iesData.angles.vertical;
    
    // Get candela values for the first horizontal angle (usually the only one for symmetrical fixtures)
    const candelaValues = iesData.candelaValues[0];
    
    if (!verticalAngles || !candelaValues || verticalAngles.length !== candelaValues.length) {
      return null;
    }
    
    // Find maximum candela value and its index
    let maxCandela = 0;
    let maxCandelaIndex = 0;
    
    for (let i = 0; i < candelaValues.length; i++) {
      if (candelaValues[i] > maxCandela) {
        maxCandela = candelaValues[i];
        maxCandelaIndex = i;
      }
    }
    
    // Calculate 50% and 10% of max candela
    const beamThreshold = maxCandela * 0.5;
    const fieldThreshold = maxCandela * 0.1;
    
    // Find the beam angle (50% of max)
    let beamAngleValue = 0;
    for (let i = maxCandelaIndex; i < candelaValues.length; i++) {
      if (candelaValues[i] <= beamThreshold) {
        // Interpolate to get a more accurate angle
        const ratio = (beamThreshold - candelaValues[i - 1]) / (candelaValues[i] - candelaValues[i - 1]);
        beamAngleValue = verticalAngles[i - 1] + ratio * (verticalAngles[i] - verticalAngles[i - 1]);
        break;
      }
    }
    
    // Find the field angle (10% of max)
    let fieldAngleValue = 0;
    for (let i = maxCandelaIndex; i < candelaValues.length; i++) {
      if (candelaValues[i] <= fieldThreshold) {
        // Interpolate to get a more accurate angle
        const ratio = (fieldThreshold - candelaValues[i - 1]) / (candelaValues[i] - candelaValues[i - 1]);
        fieldAngleValue = verticalAngles[i - 1] + ratio * (verticalAngles[i] - verticalAngles[i - 1]);
        break;
      }
    }
    
    // Convert degrees to radians
    const beamAngle = (beamAngleValue * Math.PI) / 180;
    const fieldAngle = (fieldAngleValue * Math.PI) / 180;
    
    return { beamAngle, fieldAngle };
  } catch (error) {
    console.error('Error calculating light angles:', error);
    return null;
  }
}

/**
 * Creates fallback IES data when loading fails
 * @param profilePath - Original profile path (used to determine fixture type)
 * @returns Mock IES data with reasonable defaults
 */
function createFallbackIESData(profilePath: string): IESData {
  // Default values
  const totalLumens = 1000;
  const maxCandela = 2000;
  let beamAngle = Math.PI / 6; // 30 degrees
  let fieldAngle = Math.PI / 4; // 45 degrees
  
  // Try to determine fixture type from path to set better defaults
  if (profilePath.toLowerCase().includes('spot')) {
    beamAngle = Math.PI / 8; // 22.5 degrees
    fieldAngle = Math.PI / 6; // 30 degrees
  } else if (profilePath.toLowerCase().includes('flood')) {
    beamAngle = Math.PI / 4; // 45 degrees
    fieldAngle = Math.PI / 3; // 60 degrees
  } else if (profilePath.toLowerCase().includes('wall') || profilePath.toLowerCase().includes('sconce')) {
    beamAngle = Math.PI / 3; // 60 degrees
    fieldAngle = Math.PI / 2.5; // 72 degrees
  } else if (profilePath.toLowerCase().includes('graz')) {
    beamAngle = Math.PI / 12; // 15 degrees
    fieldAngle = Math.PI / 8; // 22.5 degrees
  }
  
  // Create vertical angles (0 to 90 degrees with 5-degree steps)
  const verticalAngles = Array.from({ length: 19 }, (_, i) => i * 5);
  
  // Create candela values with appropriate falloff based on beam angle
  const candelaValues = [verticalAngles.map(angle => {
    const angleRad = (angle * Math.PI) / 180;
    // Create a falloff curve that approximates the beam angle
    const beamAngleDeg = (beamAngle * 180) / Math.PI;
    const falloff = Math.cos(angleRad) ** (90 / beamAngleDeg);
    return maxCandela * Math.max(0, falloff);
  })];
  
  return {
    totalLumens,
    maxCandela,
    angles: {
      vertical: verticalAngles,
      horizontal: [0], // Assume symmetric distribution
    },
    candelaValues,
    beamAngle,
    fieldAngle
  };
} 