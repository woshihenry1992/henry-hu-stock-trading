import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const themes = {
  dark: {
    name: 'Dark Trading',
    colors: {
      primary: '#3b82f6', // Blue
      secondary: '#8b5cf6', // Purple
      background: '#1a1a1a', // Dark gray
      surface: '#2d2d2d', // Darker gray
      card: '#333333', // Card background
      text: '#ffffff', // White text
      textSecondary: '#a0a0a0', // Light gray text
      border: '#404040', // Border color
      success: '#10b981', // Green for profits
      error: '#ef4444', // Red for losses
      warning: '#f59e0b', // Yellow
      info: '#3b82f6', // Blue
    },
    gradients: {
      primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      card: 'linear-gradient(135deg, #333333 0%, #2d2d2d 100%)',
    }
  },
  modern: {
    name: 'Modern Gradient',
    colors: {
      primary: '#8b5cf6', // Purple
      secondary: '#3b82f6', // Blue
      background: '#f8fafc', // Light gray
      surface: '#ffffff', // White
      card: '#ffffff', // White cards
      text: '#1e293b', // Dark text
      textSecondary: '#64748b', // Gray text
      border: '#e2e8f0', // Light border
      success: '#10b981', // Green
      error: '#ef4444', // Red
      warning: '#f59e0b', // Yellow
      info: '#3b82f6', // Blue
    },
    gradients: {
      primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      card: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    }
  }
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('modern');

  const value = {
    currentTheme,
    setCurrentTheme,
    theme: themes[currentTheme],
    themes
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 