import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const BackgroundPattern = ({ children }) => {
  const { theme } = useTheme();

  const getBackgroundStyle = () => {
    switch (theme.name) {
      case 'Dark Trading':
        return {
          backgroundColor: '#1a1a1a' // Solid dark background
        };
      
      case 'Modern Gradient':
        return {
          backgroundColor: '#f8fafc' // Solid light background
        };
      
      default:
        return {
          backgroundColor: theme.colors.background
        };
    }
  };

  return (
    <div 
      className="min-h-screen w-full"
      style={getBackgroundStyle()}
    >
      {children}
    </div>
  );
};

export default BackgroundPattern; 