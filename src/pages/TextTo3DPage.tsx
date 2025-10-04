import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextPromptInterface, EnvironmentType } from '../components/AIWorkflow/TextPromptInterface';
import { ImageVariationSelector } from '../components/AIWorkflow/ImageVariationSelector';
import { ModelPreview } from '../components/AIWorkflow/ModelPreview';
import { useMultiStageGeneration } from '../hooks/useMultiStageGeneration';
import { useMeshyMultiImage } from '../hooks/useMeshyMultiImage';

interface GeneratedImage {
  id: string;
  url: string;
  prompt?: string;
  base64Data?: string;
  viewLabel?: string;
}

type FlowStep = 'prompt' | 'primary-selection' | 'multiview-review' | 'preview';

const PRIMARY_VARIATION_COUNT = 4;

export const TextTo3DPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    primaryStatus,
    multiviewStatus,
    generatePrimary,
    generateMultiView,
    primaryImages,
    multiViewImages,
    resetAll,
    resetMultiView,
    error: generationError,
  } = useMultiStageGeneration();
  const {
    state: meshyState,
    error: meshyError,
    startConversion,
    reset: resetMeshy,
    progress: meshyProgress,
    taskStatus: meshyTaskStatus,
    modelUrl: meshyViewerUrl,
    downloadUrl: meshyDownloadUrl,
  } = useMeshyMultiImage();

  const [currentStep, setCurrentStep] = useState<FlowStep>('prompt');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [currentStyle, setCurrentStyle] = useState<string>('realistic');
  const [environment, setEnvironment] = useState<EnvironmentType>('exterior');
  const [selectedPrimary, setSelectedPrimary] = useState<GeneratedImage | null>(null);
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(null);
  const [conversionStatus, setConversionStatus] = useState<'idle' | 'converting' | 'succeeded'>('idle');
  const variationCountRef = useRef<number>(PRIMARY_VARIATION_COUNT);

  const isGeneratingPrimary = primaryStatus === 'generating-primary';
  const isGeneratingMultiview = multiviewStatus === 'generating-multiview';
  const isGenerating = isGeneratingPrimary || isGeneratingMultiview;
  const isMeshyStreaming = meshyState === 'streaming';
  const isMeshyCreating = meshyState === 'creating-task';
  const isConverting =
    conversionStatus === 'converting' || isMeshyCreating || isMeshyStreaming;

  useEffect(() => {
    if (isMeshyCreating || isMeshyStreaming) {
      setConversionStatus('converting');
    } else if (meshyState === 'succeeded') {
      setConversionStatus('succeeded');
    } else if (meshyState === 'failed') {
      setConversionStatus('idle');
    }
  }, [isMeshyCreating, isMeshyStreaming, meshyState]);

  const handleTextGenerate = async (prompt: string, style: string, env: EnvironmentType, variations: number) => {
    setCurrentPrompt(prompt);
    setCurrentStyle(style);
    setEnvironment(env);
    resetAll();
    setCurrentStep('prompt');
    variationCountRef.current = Math.min(Math.max(variations, 1), PRIMARY_VARIATION_COUNT);

    try {
      await generatePrimary({
        prompt,
        style,
        environment: env,
        count: variationCountRef.current,
      });
      setCurrentStep('primary-selection');
    } catch (err) {
      console.error('Primary variation generation failed:', err);
    }
  };

  const handlePromptMutation = (value: string) => {
    setCurrentPrompt(value);
  };

  const handlePromptRegenerate = async () => {
    if (!currentPrompt.trim()) {
      return;
    }

    try {
      resetAll();
      setSelectedPrimary(null);
      resetMeshy();
      await generatePrimary({
        prompt: currentPrompt,
        style: currentStyle,
        environment,
        count: variationCountRef.current,
      });
      setCurrentStep('primary-selection');
    } catch (err) {
      console.error('Prompt regeneration failed:', err);
    }
  };

  const handlePrimarySelect = async (image: GeneratedImage) => {
    setSelectedPrimary(image);
    try {
      resetMultiView();
      resetMeshy();
      await generateMultiView({
        basePrompt: currentPrompt,
        style: currentStyle,
        environment,
      });
      setCurrentStep('multiview-review');
    } catch (err) {
      console.error('Multi-view generation failed:', err);
    }
  };

  const handleProceedToConversion = async () => {
    if (!multiViewImages.length) return;
    setConversionStatus('converting');

    try {
      const viewerUrl = await startConversion(multiViewImages);
      setGeneratedModelUrl(viewerUrl);
      setConversionStatus('succeeded');
      setCurrentStep('preview');
    } catch (err) {
      console.error('Meshy conversion failed:', err);
      setConversionStatus('idle');
    }
  };

  const handleModelConfirm = () => {
    navigate('/demo');
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleBackToPrompt = () => {
    setCurrentStep('prompt');
    resetAll();
    setSelectedPrimary(null);
    setGeneratedModelUrl(null);
    setConversionStatus('idle');
    resetMeshy();
  };

  const handleBackToPrimarySelection = () => {
    setCurrentStep('primary-selection');
    setSelectedPrimary(null);
  };

  if (isGenerating || isConverting) {
    const activeMessage = isGeneratingPrimary
      ? 'Gemini is exploring hero variations of your concept…'
      : isGeneratingMultiview
        ? 'Locking consistent views for 3D reconstruction…'
        : isMeshyCreating
          ? 'Submitting multi-view bundle to Meshy…'
          : meshyTaskStatus === 'IN_PROGRESS'
            ? `Meshy is processing: ${meshyProgress}% complete…`
            : meshyState === 'succeeded'
              ? 'Meshy finished processing. Preparing viewer…'
              : 'Converting to 3D…';

    const stageHeadline = isGeneratingPrimary
      ? 'Generating primary concepts…'
      : isGeneratingMultiview
        ? 'Capturing multi-view coverage…'
        : isMeshyCreating
          ? 'Creating Meshy task…'
          : meshyState === 'succeeded'
            ? 'Preparing viewer…'
            : 'Converting to 3D…';

    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h2>{stageHeadline}</h2>
          <div className="loading-spinner"></div>
          <p>{activeMessage}</p>
          {(generationError || meshyError) && (
            <p style={{ marginTop: '1rem', color: '#ff8b7b' }}>
              {generationError?.message ?? meshyError?.message}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (currentStep === 'prompt') {
    return (
      <TextPromptInterface
        onGenerate={handleTextGenerate}
        onBack={handleBackToHome}
        isGenerating={isGenerating}
        errorMessage={generationError?.message}
      />
    );
  }

  if (currentStep === 'primary-selection') {
    return (
      <ImageVariationSelector
        images={primaryImages}
        onSelect={handlePrimarySelect}
        onBack={handleBackToPrompt}
        prompt={currentPrompt}
        mode="primary"
        onPromptChange={handlePromptMutation}
        onRegenerate={handlePromptRegenerate}
        isBusy={isGenerating}
        errorMessage={generationError?.message}
      />
    );
  }

  if (currentStep === 'multiview-review') {
    return (
      <ImageVariationSelector
        images={multiViewImages.map((img, index) => ({
          ...img,
          viewLabel: img.viewLabel ?? `View ${index + 1}`,
          prompt: currentPrompt,
        }))}
        onContinue={handleProceedToConversion}
        onBack={handleBackToPrimarySelection}
        prompt={currentPrompt}
        mode="multiview"
        isBusy={isGenerating || isMeshyCreating || isMeshyStreaming}
        errorMessage={meshyError?.message}
        continueLabel="Generate Meshy 3D Model"
        progress={isMeshyStreaming ? meshyProgress : undefined}
        statusMessage={meshyTaskStatus ? `Meshy status: ${meshyTaskStatus.toLowerCase()}` : undefined}
      />
    );
  }

  if (currentStep === 'preview' && generatedModelUrl) {
    return (
      <ModelPreview
        modelUrl={meshyViewerUrl ?? generatedModelUrl ?? ''}
        downloadUrl={meshyDownloadUrl ?? undefined}
        sourceImage={selectedPrimary?.url}
        onConfirm={handleModelConfirm}
        onBack={handleBackToPrimarySelection}
        onRegenerate={handleBackToPrompt}
      />
    );
  }

  return null;
};
