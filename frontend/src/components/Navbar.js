import React from 'react';
import ThemeSwitcher from './ThemeSwitcher';
import { useTheme } from '../contexts/ThemeContext';

const Navbar = ({ user, onLogout }) => {
  const { theme } = useTheme();

  return (
    <nav className="shadow-lg" style={{ backgroundColor: theme.colors.surface }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold" style={{ color: theme.colors.primary }}>
                Henry Hu's Stock Trading
              </h1>
            </div>
          </div>
          <div className="flex items-center">
            <div className="ml-4 flex items-center md:ml-6">
              <div className="flex items-center space-x-4">
                <ThemeSwitcher />
                <span style={{ color: theme.colors.textSecondary }}>
                  Welcome, {user?.username}!
                </span>
                <button
                  onClick={onLogout}
                  className="hover:opacity-80 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  style={{ backgroundColor: theme.colors.error }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 