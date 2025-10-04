import React, { useState, useRef, DragEvent } from 'react';
import './ImageUploadInterface.css';

interface ImageUploadInterfaceProps {
  onUpload: (file: File) => void;
  onBack: () => void;
  isProcessing?: boolean;
}

export const ImageUploadInterface: React.FC<ImageUploadInterfaceProps> = ({
  onUpload,
  onBack,
  isProcessing = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadClick = () => {
    if (selectedFile) {
      onUpload(selectedFile);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="image-upload-container">
      <div className="upload-header">
        <button className="back-button" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h2 className="upload-title">Upload Your Image</h2>
        <p className="upload-subtitle">
          Upload a photo or sketch of a space to convert into a 3D model
        </p>
      </div>

      <div className="upload-content">
        {!preview ? (
          <div
            className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="dropzone-content">
              <div className="upload-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="dropzone-title">
                {isDragging ? 'Drop your image here' : 'Drag & drop your image'}
              </h3>
              <p className="dropzone-subtitle">or</p>
              <button className="browse-button" type="button">
                Browse Files
              </button>
              <p className="dropzone-hint">
                Supports: JPG, PNG, WebP (Max 10MB)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="file-input-hidden"
            />
          </div>
        ) : (
          <div className="preview-section">
            <div className="preview-wrapper">
              <img src={preview} alt="Preview" className="preview-image" />
              <button className="clear-button" onClick={handleClearFile}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="preview-info">
              <div className="file-details">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="file-info">
                  <span className="file-name">{selectedFile?.name}</span>
                  <span className="file-size">
                    {selectedFile ? (selectedFile.size / 1024 / 1024).toFixed(2) : '0'} MB
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Best practices section */}
        <div className="upload-tips">
          <h4 className="tips-title">📸 Best Practices for Better Results</h4>
          <ul className="tips-list">
            <li>
              <strong>Clear view:</strong> Use images with a clear, unobstructed view of the space
            </li>
            <li>
              <strong>Good lighting:</strong> Well-lit photos produce better 3D reconstructions
            </li>
            <li>
              <strong>Multiple angles:</strong> Interior shots showing walls, ceiling, and floor work best
            </li>
            <li>
              <strong>Architectural drawings:</strong> Floor plans and isometric views are also supported
            </li>
          </ul>
        </div>

        {/* Action button */}
        {preview && (
          <div className="upload-actions">
            <button
              className="generate-button"
              onClick={handleUploadClick}
              disabled={!selectedFile || isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className="spinner"></span>
                  Processing...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                          d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate 3D Model
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="upload-footer">
        <div className="example-section">
          <span>Need inspiration?</span>
          <button className="example-link" onClick={() => {/* Show examples */}}>
            View example images
          </button>
        </div>
      </div>
    </div>
  );
};
