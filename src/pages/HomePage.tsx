import React from 'react';
import { useNavigate } from 'react-router-dom';
import { InitialChoice } from '../components/AIWorkflow/InitialChoice';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleSelectOption = (option: 'text' | 'image' | 'demo') => {
    switch (option) {
      case 'text':
        navigate('/text-to-3d');
        break;
      case 'image':
        navigate('/image-to-3d');
        break;
      case 'demo':
        navigate('/demo');
        break;
    }
  };

  return <InitialChoice onSelectOption={handleSelectOption} />;
};
