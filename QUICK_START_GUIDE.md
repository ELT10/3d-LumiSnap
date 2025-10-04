# 🚀 Quick Start Guide - AI Integration

## Step 1: Get API Keys

### Google Gemini 2.0 Flash (Required)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `.env`:
```env
VITE_GEMINI_API_KEY=your_api_key_here
```

### 3D Conversion Service (Choose One)

#### Option A: Meshy AI (Recommended for Production)
- Sign up at [Meshy.ai](https://www.meshy.ai)
- Get API key from dashboard
- Add to `.env`:
```env
VITE_MESHY_API_KEY=your_api_key_here
```

#### Option B: TripoSR (Free, Good for MVP)
- Use Hugging Face API: [Sign up here](https://huggingface.co/join)
- Get token from settings
- Add to `.env`:
```env
VITE_HUGGINGFACE_TOKEN=your_token_here
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Update App.tsx

Replace your current `App.tsx` with this enhanced version:

```typescript
import { useState } from 'react';
import Scene from './components/Scene';
import { FixturePanel } from './components';
import { InitialChoice } from './components/AIWorkflow/InitialChoice';
import { TextPromptInterface } from './components/AIWorkflow/TextPromptInterface';
// Import other AI workflow components as you build them
import './App.css';

type AppMode = 'choice' | 'text' | 'image' | 'demo' | 'simulation';

function App() {
  const [appMode, setAppMode] = useState<AppMode>('choice');
  const [generatedModelPath, setGeneratedModelPath] = useState<string | null>(null);

  const handleModeSelection = (mode: 'text' | 'image' | 'demo') => {
    if (mode === 'demo') {
      // Load the existing demo
      setAppMode('simulation');
    } else {
      setAppMode(mode);
    }
  };

  const handleTextGeneration = async (prompt: string, style: string) => {
    // This will call your AI services
    console.log('Generating from:', prompt, style);
    // After generation, transition to simulation
    // setGeneratedModelPath(newModelPath);
    // setAppMode('simulation');
  };

  // Render based on current mode
  if (appMode === 'choice') {
    return <InitialChoice onSelectOption={handleModeSelection} />;
  }

  if (appMode === 'text') {
    return (
      <TextPromptInterface
        onGenerate={handleTextGeneration}
        onBack={() => setAppMode('choice')}
      />
    );
  }

  // Your existing simulation view
  return (
    <div className="app">
      <Scene showStats={true} />
      <FixturePanel />
      {/* Rest of your existing UI */}
    </div>
  );
}

export default App;
```

## Step 4: Create Environment Config

Create `src/config/ai.config.ts`:

```typescript
export const AI_CONFIG = {
  gemini: {
    apiKey: import.meta.env.VITE_GEMINI_API_KEY,
    model: 'gemini-2.0-flash-exp',
  },
  meshyAI: {
    apiKey: import.meta.env.VITE_MESHY_API_KEY,
    endpoint: 'https://api.meshy.ai/v2',
  },
  huggingFace: {
    token: import.meta.env.VITE_HUGGINGFACE_TOKEN,
  },
};
```

## Step 5: Test the Flow

1. **Start the dev server:**
```bash
npm run dev
```

2. **Test each pathway:**
   - Click "Demo Simulation" - Should load existing app
   - Click "Text to 3D" - Should show prompt interface
   - Click "Image to 3D" - Should show upload interface (to be built)

## Step 6: Implement AI Services

### Basic Text-to-Image Generation:

```typescript
// src/hooks/useAIGeneration.ts
import { useState } from 'react';
import { createImageGenerator } from '../services/ai/imageGenerator';
import { createModel3DConverter } from '../services/ai/model3DConverter';
import { AI_CONFIG } from '../config/ai.config';

export const useAIGeneration = () => {
  const [status, setStatus] = useState<'idle' | 'generating' | 'converting' | 'complete'>('idle');
  const [progress, setProgress] = useState(0);

  const generateFromText = async (prompt: string, style: string) => {
    try {
      setStatus('generating');
      setProgress(25);
      
      // Generate images
      const imageGen = createImageGenerator('gemini', AI_CONFIG.gemini.apiKey);
      const images = await imageGen.generateFromText({
        type: 'text',
        prompt,
        style: style as any,
        count: 4,
      });
      
      setProgress(50);
      setStatus('converting');
      
      // Convert to 3D (after user selects an image)
      const converter = createModel3DConverter('meshy', AI_CONFIG.meshyAI.apiKey);
      const model = await converter.convertToGLB({
        image: images.images[0].url, // Use selected image
        quality: 'standard',
      });
      
      setProgress(100);
      setStatus('complete');
      
      return model;
    } catch (error) {
      console.error('Generation failed:', error);
      setStatus('idle');
      throw error;
    }
  };

  return { generateFromText, status, progress };
};
```

## Step 7: Next Components to Build

Create these in order:

1. **ImageVariationSelector.tsx** - Grid to show 4 generated images
2. **ImageUploadInterface.tsx** - For image-based generation
3. **ModelPreview.tsx** - 3D preview before loading into simulator
4. **GenerationProgress.tsx** - Status and progress indicator

## Step 8: Testing Checklist

- [ ] API keys are working
- [ ] Initial choice screen displays correctly
- [ ] Text prompt interface accepts input
- [ ] Demo mode loads existing simulation
- [ ] Error handling for API failures
- [ ] Mobile responsive design

## Common Issues & Solutions

### Issue: CORS errors with API calls
**Solution:** Use a backend proxy or serverless functions

### Issue: Large model files
**Solution:** Implement progressive loading and compression

### Issue: Slow generation times
**Solution:** Add engaging loading animations and status updates

## Resources

- [Google Gemini Docs](https://ai.google.dev/gemini-api/docs)
- [Meshy AI Docs](https://docs.meshy.ai)
- [Three.js GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)

## Support

For questions or issues:
1. Check the `AI_INTEGRATION_PLAN.md` for detailed architecture
2. Review `IMPLEMENTATION_SUMMARY.md` for overview
3. Test with console.log at each step to debug

---

**You're ready to build the future of AI-powered lighting design! 🎉**
