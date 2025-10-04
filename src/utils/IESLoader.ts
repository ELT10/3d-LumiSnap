import * as THREE from 'three';

// Interface for IES data with specific structure
export interface IESData {
  // Photometric data
  totalLumens: number;
  maxCandela: number;
  
  // Angular data
  angles: {
    vertical: number[];
    horizontal: number[];
  };
  
  // Photometric values
  candelaValues: number[][];
}

// Handler types for loader callbacks
type OnLoadHandler = (data: IESData) => void;
type OnProgressHandler = (event: ProgressEvent) => void;
type OnErrorHandler = (error: Error | ErrorEvent) => void;

/**
 * IES Profile Loader for Three.js
 * Loads and parses IES (Illuminating Engineering Society) photometric data files
 */
export class IESLoader {
  private manager: THREE.LoadingManager;
  
  constructor(manager?: THREE.LoadingManager) {
    this.manager = manager || new THREE.LoadingManager();
  }
  
  /**
   * Load an IES file from the specified URL
   * 
   * @param url - URL of the IES file to load
   * @param onLoad - Callback for successful load
   * @param onProgress - Callback for load progress
   * @param onError - Callback for load errors
   */
  load(
    url: string, 
    onLoad: OnLoadHandler,
    onProgress?: OnProgressHandler,
    onError?: OnErrorHandler
  ): void {
    const loader = new THREE.FileLoader(this.manager);
    loader.setResponseType('text');
    
    // Custom error handler that adapts to THREE.js error format
    const handleError = (err: unknown) => {
      if (onError) {
        if (err instanceof Error || err instanceof ErrorEvent) {
          onError(err);
        } else {
          onError(new Error(String(err)));
        }
      }
    };
    
    loader.load(
      url,
      (text) => {
        if (typeof text !== 'string') {
          handleError(new Error('IES file content is not a string'));
          return;
        }
        
        try {
          const data = this.parse(text);
          onLoad(data);
        } catch (error) {
          handleError(error);
        }
      },
      onProgress,
      handleError
    );
  }
  
  /**
   * Parse IES file text content
   * 
   * @param text - The raw text content of an IES file
   * @returns Parsed IES data object
   */
  parse(text: string): IESData {
    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
    
    let lineIndex = 0;
    
    // Skip IESNA header and metadata
    while (lineIndex < lines.length && !lines[lineIndex].includes('TILT=')) {
      lineIndex++;
    }
    
    // Check if TILT= was found
    if (lineIndex >= lines.length) {
      throw new Error('Invalid IES format: TILT= not found');
    }
    
    // Skip TILT line
    lineIndex++;
    
    // Check if we have enough lines
    if (lineIndex >= lines.length) {
      throw new Error('Invalid IES format: unexpected end of file after TILT=');
    }
    
    // Parse lamp count, lumens per lamp, multiplier, number of vertical angles, 
    // number of horizontal angles, photometric type, unit type, width/length/height
    const counts = lines[lineIndex++].trim().split(/\s+/).map(Number);
    if (counts.length < 9) {
      throw new Error('Invalid IES format: missing lamp data values');
    }
    
    const [
      lampCount, 
      lumensPerLamp, 
      multiplier, 
      verticalAnglesCount, 
      horizontalAnglesCount
    ] = counts;
    
    const totalLumens = lampCount * lumensPerLamp;
    
    // Skip metadata lines - be flexible about how many to skip
    // Some IES files have 1 line, some have 3, we'll check for numeric values
    while (lineIndex < lines.length) {
      const nextLine = lines[lineIndex];
      // If the next line contains vertical angle values (should be numeric), break out
      if (/^[\s\d.-]+$/.test(nextLine) && nextLine.split(/\s+/).filter(Boolean).length > 0) {
        break;
      }
      lineIndex++;
    }
    
    // Check if we have enough lines for vertical angles
    if (lineIndex >= lines.length) {
      throw new Error('Invalid IES format: unexpected end of file before vertical angles');
    }
    
    // Parse vertical angles
    const verticalAngles: number[] = [];
    let currentLine = lines[lineIndex++].trim().split(/\s+/).map(Number);
    let currentIndex = 0;
    
    for (let i = 0; i < verticalAnglesCount; i++) {
      if (currentIndex >= currentLine.length) {
        // Check if we have more lines
        if (lineIndex >= lines.length) {
          throw new Error(`Invalid IES format: unexpected end of file while parsing vertical angles (got ${verticalAngles.length} of ${verticalAnglesCount})`);
        }
        currentLine = lines[lineIndex++].trim().split(/\s+/).map(Number);
        currentIndex = 0;
      }
      verticalAngles.push(currentLine[currentIndex++]);
    }
    
    // Parse horizontal angles
    const horizontalAngles: number[] = [];
    if (currentIndex >= currentLine.length) {
      // Check if we have more lines
      if (lineIndex >= lines.length) {
        throw new Error('Invalid IES format: unexpected end of file before horizontal angles');
      }
      currentLine = lines[lineIndex++].trim().split(/\s+/).map(Number);
      currentIndex = 0;
    }
    
    for (let i = 0; i < horizontalAnglesCount; i++) {
      if (currentIndex >= currentLine.length) {
        // Check if we have more lines
        if (lineIndex >= lines.length) {
          throw new Error(`Invalid IES format: unexpected end of file while parsing horizontal angles (got ${horizontalAngles.length} of ${horizontalAnglesCount})`);
        }
        currentLine = lines[lineIndex++].trim().split(/\s+/).map(Number);
        currentIndex = 0;
      }
      horizontalAngles.push(currentLine[currentIndex++]);
    }
    
    // Parse candela values
    const candelaValues: number[][] = [];
    let maxCandela = 0;
    
    for (let h = 0; h < horizontalAnglesCount; h++) {
      const values: number[] = [];
      
      for (let v = 0; v < verticalAnglesCount; v++) {
        if (currentIndex >= currentLine.length) {
          // Check if we have more lines
          if (lineIndex >= lines.length) {
            throw new Error(`Invalid IES format: unexpected end of file while parsing candela values (h=${h}, v=${v})`);
          }
          currentLine = lines[lineIndex++].trim().split(/\s+/).map(Number);
          currentIndex = 0;
        }
        
        const candela = currentLine[currentIndex++] * multiplier;
        values.push(candela);
        maxCandela = Math.max(maxCandela, candela);
      }
      
      candelaValues.push(values);
    }
    
    // Return structured IES data
    return {
      totalLumens,
      maxCandela,
      angles: {
        vertical: verticalAngles,
        horizontal: horizontalAngles
      },
      candelaValues
    };
  }
} 