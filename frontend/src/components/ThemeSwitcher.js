import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeSwitcher = () => {
  const { currentTheme, setCurrentTheme, themes } = useTheme();

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Theme:
      </span>
      <select
        value={currentTheme}
        onChange={(e) => setCurrentTheme(e.target.value)}
        className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      >
        {Object.entries(themes).map(([key, theme]) => (
          <option key={key} value={key}>
            {theme.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ThemeSwitcher; 