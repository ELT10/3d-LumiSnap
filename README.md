# 3D Lighting Simulator

A web-based application for simulating lighting in 3D environments using IES photometric data profiles.

## Features

- 3D visualization of interior spaces
- Drag and drop light fixtures
- Realistic lighting simulation using IES photometric data
- Interactive scene navigation
- Real-time lighting adjustments

## Technology Stack

- React
- TypeScript
- Three.js
- Vite

## Development Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser to the local development URL (typically http://localhost:5173)

## Project Structure

- `/src/components` - React components for the UI and 3D scene
- `/src/hooks` - Custom React hooks
- `/src/utils` - Utility functions including IES parsing
- `/src/store` - Application state management
- `/public/ies` - Sample IES profile files
- `/public/models` - 3D models for the scene

## Usage

1. Navigate the 3D scene using the mouse:
   - Left-click and drag to rotate
   - Right-click and drag to pan
   - Scroll to zoom

2. Select fixtures from the panel on the right

3. Drag fixtures into the scene or click to place them

4. Select placed fixtures to adjust their properties

## IES Profiles

The application uses IES (Illuminating Engineering Society) photometric data files to simulate real-world lighting distribution patterns. Sample IES files are included in the `/public/ies` directory.

## License

MIT
