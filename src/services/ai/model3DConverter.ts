/**
 * 3D Model Conversion Service
 * Handles image-to-3D conversion using various providers
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

export interface ConversionConfig {
  provider: 'meshy' | 'csm' | 'kaedim' | 'triposr' | 'stable123';
  apiKey?: string;
  apiEndpoint?: string;
  webhookUrl?: string;
}

export interface ConversionRequest {
  image: string; // Base64 or URL
  modelType?: 'building' | 'room' | 'object';
  quality?: 'draft' | 'standard' | 'high';
  textureMode?: 'auto' | 'pbr' | 'simple';
  targetPolycount?: number;
}

export interface ConversionResponse {
  modelUrl: string;
  modelData?: ArrayBuffer;
  format: 'glb' | 'gltf' | 'obj' | 'fbx';
  metadata: {
    polycount: number;
    textureCount: number;
    fileSize: number;
    processingTime: number;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  taskId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  stats: ModelStats;
}

export interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ModelStats {
  vertexCount: number;
  faceCount: number;
  materialCount: number;
  textureCount: number;
  boundingBox: THREE.Box3;
  hasNormals: boolean;
  hasUVs: boolean;
}

interface MeshyTaskResponse {
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
  result?: string;
  model_urls: { glb: string };
  triangle_count?: number;
  texture_urls?: Record<string, string>;
  error_message?: string;
  created_at: number;
}

interface GenericConversionResponse {
  modelUrl?: string;
  format?: ConversionResponse['format'];
  metadata?: ConversionResponse['metadata'];
  status?: ConversionResponse['status'];
  taskId?: string;
  result?: string;
  jobId?: string;
}

export class Model3DConverterService {
  private config: ConversionConfig;
  private gltfLoader: GLTFLoader;
  private dracoLoader: DRACOLoader;

  constructor(config: ConversionConfig) {
    this.config = config;
    
    // Initialize Three.js loaders
    this.gltfLoader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('/draco/'); // Assuming Draco decoder files are served
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
  }

  /**
   * Convert image to 3D model
   */
  async convertToGLB(request: ConversionRequest): Promise<ConversionResponse> {
    try {
      switch (this.config.provider) {
        case 'meshy':
          return await this.convertWithMeshy(request);
        case 'csm':
          return await this.convertWithCSM(request);
        case 'kaedim':
          return await this.convertWithKaedim(request);
        case 'triposr':
          return await this.convertWithTripoSR(request);
        case 'stable123':
          return await this.convertWithStable123(request);
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('3D conversion failed:', error);
      throw error;
    }
  }

  /**
   * Meshy AI conversion
   */
  private async convertWithMeshy(request: ConversionRequest): Promise<ConversionResponse> {
    // Step 1: Submit conversion task
    const taskResponse = await fetch('https://api.meshy.ai/v2/image-to-3d', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: request.image,
        enable_pbr: request.textureMode === 'pbr',
        surface_mode: request.quality === 'high' ? 'smooth' : 'standard',
        webhook_url: this.config.webhookUrl,
      }),
    });

    if (!taskResponse.ok) {
      throw new Error(`Meshy API error: ${taskResponse.statusText}`);
    }

    const taskData = await taskResponse.json();
    const taskId = taskData.result;

    // Step 2: Poll for completion
    return await this.pollMeshyTask(taskId);
  }

  /**
   * Poll Meshy task until completion
   */
  private async pollMeshyTask(taskId: string): Promise<ConversionResponse> {
    const maxAttempts = 60; // 5 minutes max
    const pollInterval = 5000; // 5 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`https://api.meshy.ai/v2/image-to-3d/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check task status: ${response.statusText}`);
      }

    const data: MeshyTaskResponse = await response.json();

      if (data.status === 'SUCCEEDED') {
        return {
          modelUrl: data.model_urls.glb,
          format: 'glb',
          metadata: {
            polycount: data.triangle_count || 0,
            textureCount: data.texture_urls ? Object.keys(data.texture_urls).length : 0,
            fileSize: 0, // Would need to fetch to get size
            processingTime: Date.now() - data.created_at,
          },
          status: 'completed',
          taskId: taskId,
        };
      } else if (data.status === 'FAILED') {
        throw new Error(`Conversion failed: ${data.error_message || 'Unknown error'}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Conversion timeout');
  }

  /**
   * CSM (Common Sense Machines) conversion
   */
  private async convertWithCSM(request: ConversionRequest): Promise<ConversionResponse> {
    const response = await fetch('https://api.csm.ai/image-to-3d', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: request.image,
        quality: request.quality,
      }),
    });

    if (!response.ok) {
      throw new Error(`CSM API error: ${response.statusText}`);
    }

    const data: GenericConversionResponse = await response.json();

    const metadata = data.metadata ?? {
      polycount: 0,
      textureCount: 0,
      fileSize: 0,
      processingTime: 0,
    } satisfies ConversionResponse['metadata'];

    return {
      modelUrl: data.modelUrl ?? '',
      format: (data.format as ConversionResponse['format']) ?? 'glb',
      metadata,
      status: data.status ?? 'processing',
      taskId: data.taskId ?? data.result,
    };
  }

  /**
   * Kaedim conversion
   */
  private async convertWithKaedim(request: ConversionRequest): Promise<ConversionResponse> {
    const response = await fetch('https://api.kaedim.com/v1/models', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: request.image,
        detail: request.quality ?? 'standard',
      }),
    });

    if (!response.ok) {
      throw new Error(`Kaedim API error: ${response.statusText}`);
    }

    const data: GenericConversionResponse = await response.json();

    const metadata = data.metadata ?? {
      polycount: 0,
      textureCount: 0,
      fileSize: 0,
      processingTime: 0,
    } satisfies ConversionResponse['metadata'];

    return {
      modelUrl: data.modelUrl ?? '',
      format: (data.format as ConversionResponse['format']) ?? 'glb',
      metadata,
      status: data.status ?? 'pending',
      taskId: data.taskId ?? data.jobId,
    };
  }

  /**
   * TripoSR local/hosted conversion
   */
  private async convertWithTripoSR(request: ConversionRequest): Promise<ConversionResponse> {
    const endpoint = this.config.apiEndpoint || 'https://api-inference.huggingface.co/models/stabilityai/TripoSR';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: request.image,
      }),
    });

    if (!response.ok) {
      throw new Error(`TripoSR API error: ${response.statusText}`);
    }

    const modelData = await response.arrayBuffer();

    const metadata = {
      polycount: 0,
      textureCount: 0,
      fileSize: modelData.byteLength,
      processingTime: 0,
    } satisfies ConversionResponse['metadata'];

    return {
      modelData,
      modelUrl: '',
      format: 'glb',
      metadata,
      status: 'completed',
    };
  }

  /**
   * Stable123 conversion
   */
  private async convertWithStable123(request: ConversionRequest): Promise<ConversionResponse> {
    const endpoint = this.config.apiEndpoint || 'https://api.stability.ai/v1/zero123';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: request.image,
        mode: request.textureMode ?? 'auto',
      }),
    });

    if (!response.ok) {
      throw new Error(`Stable123 API error: ${response.statusText}`);
    }

    const data: GenericConversionResponse = await response.json();

    const metadata = data.metadata ?? {
      polycount: 0,
      textureCount: 0,
      fileSize: 0,
      processingTime: 0,
    } satisfies ConversionResponse['metadata'];

    return {
      modelUrl: data.modelUrl ?? '',
      format: (data.format as ConversionResponse['format']) ?? 'glb',
      metadata,
      status: data.status ?? 'processing',
      taskId: data.taskId ?? data.jobId,
    };
  }

  /**
   * Optimize 3D model for web performance
   */
  async optimizeModel(modelData: ArrayBuffer | string): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      // Load the model
      const loader = this.gltfLoader;
      
      const onLoad = (gltf: GLTF) => {
        const scene = gltf.scene;
        
        // Optimization steps
        this.optimizeScene(scene);
        
        // Export optimized model
        // Note: This would require GLTFExporter which isn't shown here
        // const exporter = new GLTFExporter();
        // exporter.parse(scene, (result) => {
        //   resolve(result as ArrayBuffer);
        // }, { binary: true });
        
        // Placeholder return
        resolve(modelData as ArrayBuffer);
      };
      
      const onError = (error: unknown) => {
        reject(error instanceof Error ? error : new Error(String(error)));
      };
      
      if (typeof modelData === 'string') {
        loader.load(modelData, onLoad, undefined, onError);
      } else {
        // Parse from ArrayBuffer
        const blob = new Blob([modelData], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);
        loader.load(url, onLoad, undefined, onError);
      }
    });
  }

  /**
   * Optimize Three.js scene
   */
  private optimizeScene(scene: THREE.Scene): void {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // Optimize geometry
        if (object.geometry) {
          object.geometry.computeBoundingBox();
          object.geometry.computeBoundingSphere();

          // Merge vertices if possible
          // Note: This would require BufferGeometryUtils
          // BufferGeometryUtils.mergeVertices(object.geometry);
        }

        // Optimize materials
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => this.optimizeMaterial(material));
          } else {
            this.optimizeMaterial(object.material);
          }
        }

        // Enable frustum culling
        object.frustumCulled = true;

        // Set appropriate shadow settings
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }

  private optimizeMaterial(material: THREE.Material): void {
    if (material instanceof THREE.MeshStandardMaterial) {
      const ensureTexture = (key: keyof THREE.MeshStandardMaterial): THREE.Texture | undefined => {
        const candidate = material[key];
        return candidate instanceof THREE.Texture ? candidate : undefined;
      };

      const textureKeys: Array<keyof THREE.MeshStandardMaterial> = ['map', 'normalMap', 'roughnessMap', 'metalnessMap'];
      textureKeys.forEach(key => {
        const texture = ensureTexture(key);
        if (texture && texture.image) {
          const maxSize = 2048;
          if (texture.image.width > maxSize || texture.image.height > maxSize) {
            // Resize logic would go here
          }
        }
      });

      material.roughness = material.roughness || 0.7;
      material.metalness = material.metalness || 0.2;
    }
  }

  /**
   * Validate 3D model for use in lighting simulation
   */
  async validateModel(modelData: ArrayBuffer | string): Promise<ValidationResult> {
    return new Promise((resolve, reject) => {
      const loader = this.gltfLoader;
      const issues: ValidationIssue[] = [];

      const onLoad = (gltf: GLTF) => {
        const scene = gltf.scene;
        const stats: ModelStats = {
          vertexCount: 0,
          faceCount: 0,
          materialCount: 0,
          textureCount: 0,
          boundingBox: new THREE.Box3(),
          hasNormals: true,
          hasUVs: true,
        };

        const materials = new Set<THREE.Material>();
        const textures = new Set<THREE.Texture>();

    scene.traverse((object: THREE.Object3D) => {
          if (object instanceof THREE.Mesh) {
            const geometry = object.geometry;

            if (geometry) {
              stats.vertexCount += geometry.attributes.position?.count || 0;
              stats.faceCount += geometry.index ? geometry.index.count / 3 :
                                  (geometry.attributes.position?.count || 0) / 3;

              if (!geometry.attributes.normal) {
                stats.hasNormals = false;
                issues.push({
                  type: 'warning',
                  message: `Mesh "${object.name}" missing normals`,
                  severity: 'medium',
                });
              }

              if (!geometry.attributes.uv) {
                stats.hasUVs = false;
                issues.push({
                  type: 'warning',
                  message: `Mesh "${object.name}" missing UV coordinates`,
                  severity: 'low',
                });
              }
            }

            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach(material => materials.add(material));
              } else {
                materials.add(object.material);
              }
            }

            const box = new THREE.Box3().setFromObject(object);
            stats.boundingBox.union(box);
          }
        });

        stats.materialCount = materials.size;

        const collectTexture = (material: THREE.MeshStandardMaterial, key: keyof THREE.MeshStandardMaterial) => {
          const candidate = material[key];
          if (candidate instanceof THREE.Texture) {
            textures.add(candidate);
          }
        };

        materials.forEach(material => {
          if (material instanceof THREE.MeshStandardMaterial) {
            const textureKeys: Array<keyof THREE.MeshStandardMaterial> = ['map', 'normalMap', 'roughnessMap', 'metalnessMap'];
            textureKeys.forEach(key => collectTexture(material, key));
          }
        });

        stats.textureCount = textures.size;

        if (stats.vertexCount > 1000000) {
          issues.push({
            type: 'warning',
            message: 'Model has very high polygon count, may impact performance',
            severity: 'high',
          });
        }

        if (stats.boundingBox.isEmpty()) {
          issues.push({
            type: 'error',
            message: 'Model has no geometry',
            severity: 'high',
          });
        }

        const size = new THREE.Vector3();
        stats.boundingBox.getSize(size);

        if (size.x < 0.01 || size.y < 0.01 || size.z < 0.01) {
          issues.push({
            type: 'warning',
            message: 'Model is extremely small, may need scaling',
            severity: 'medium',
          });
        }

        if (size.x > 1000 || size.y > 1000 || size.z > 1000) {
          issues.push({
            type: 'warning',
            message: 'Model is extremely large, may need scaling',
            severity: 'medium',
          });
        }

        resolve({
          isValid: issues.filter(i => i.type === 'error').length === 0,
          issues,
          stats,
        });
      };

      const onError = (error: unknown) => {
        reject(error instanceof Error ? error : new Error(String(error)));
      };

      if (typeof modelData === 'string') {
        loader.load(modelData, onLoad, undefined, onError);
      } else {
        const blob = new Blob([modelData], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);
        loader.load(url, onLoad, undefined, onError);
      }
    });
  }

  /**
   * Auto-fix common model issues
   */
  async autoFixModel(modelData: ArrayBuffer): Promise<ArrayBuffer> {
    // This would implement automatic fixes for common issues:
    // - Generate missing normals
    // - Generate missing UVs
    // - Fix inverted faces
    // - Optimize topology
    // - Remove duplicate vertices
    return modelData; // Placeholder
  }
}

// Factory function for easy initialization
export const createModel3DConverter = (
  provider: 'meshy' | 'csm' | 'kaedim' | 'triposr' | 'stable123' = 'meshy',
  apiKey?: string
): Model3DConverterService => {
  return new Model3DConverterService({
    provider,
    apiKey,
  });
};
