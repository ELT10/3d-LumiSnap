import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageUploadInterface } from '../components/AIWorkflow/ImageUploadInterface';
import { ImageVariationSelector } from '../components/AIWorkflow/ImageVariationSelector';
import { ModelPreview } from '../components/AIWorkflow/ModelPreview';

interface GeneratedImage {
  id: string;
  url: string;
  prompt?: string;
}

type FlowStep = 'upload' | 'selection' | 'preview';

export const ImageTo3DPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [currentStep, setCurrentStep] = useState<FlowStep>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(null);

  const handleImageUpload = async (imageFile: File) => {
    setIsLoading(true);
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockImages: GeneratedImage[] = [
      { id: '1', url: URL.createObjectURL(imageFile) },
      { id: '2', url: 'https://picsum.photos/seed/upload1/800/600' },
      { id: '3', url: 'https://picsum.photos/seed/upload2/800/600' },
      { id: '4', url: 'https://picsum.photos/seed/upload3/800/600' },
    ];
    
    setGeneratedImages(mockImages);
    setIsLoading(false);
    setCurrentStep('selection');
  };

  const handleImageSelect = async (image: GeneratedImage) => {
    setSelectedImage(image);
    setIsLoading(true);
    
    // Simulate 3D conversion
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setGeneratedModelUrl('/models/house3/house.glb');
    setIsLoading(false);
    setCurrentStep('preview');
  };

  const handleModelConfirm = () => {
    navigate('/demo');
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleBackToUpload = () => {
    setCurrentStep('upload');
    setGeneratedImages([]);
    setSelectedImage(null);
  };

  const handleBackToSelection = () => {
    setCurrentStep('selection');
    setSelectedImage(null);
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h2>
            {currentStep === 'upload' && 'Processing Image...'}
            {currentStep === 'selection' && 'Converting to 3D...'}
            {currentStep === 'preview' && 'Loading Model...'}
          </h2>
          <div className="loading-spinner"></div>
          <p>
            {currentStep === 'upload' && 'Analyzing and enhancing your image...'}
            {currentStep === 'selection' && 'Building 3D model from your selection...'}
            {currentStep === 'preview' && 'Preparing your lighting simulation...'}
          </p>
        </div>
      </div>
    );
  }

  // Render based on current step
  if (currentStep === 'upload') {
    return (
      <ImageUploadInterface
        onUpload={handleImageUpload}
        onBack={handleBackToHome}
        isProcessing={false}
      />
    );
  }

  if (currentStep === 'selection') {
    return (
      <ImageVariationSelector
        images={generatedImages}
        onSelect={handleImageSelect}
        onBack={handleBackToUpload}
      />
    );
  }

  if (currentStep === 'preview' && generatedModelUrl) {
    return (
      <ModelPreview
        modelUrl={generatedModelUrl}
        sourceImage={selectedImage?.url}
        onConfirm={handleModelConfirm}
        onBack={handleBackToSelection}
        onRegenerate={handleBackToUpload}
      />
    );
  }

  return null;
};
