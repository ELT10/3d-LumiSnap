import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { TextTo3DPage } from './pages/TextTo3DPage';
import { ImageTo3DPage } from './pages/ImageTo3DPage';
import { DemoPage } from './pages/DemoPage';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/text-to-3d" element={<TextTo3DPage />} />
      <Route path="/image-to-3d" element={<ImageTo3DPage />} />
      <Route path="/demo" element={<DemoPage />} />
    </Routes>
  );
}

export default App;