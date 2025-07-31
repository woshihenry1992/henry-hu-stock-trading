import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';
import { API_ENDPOINTS } from '../config/api';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(API_ENDPOINTS.LOGIN, formData);
      onLogin(response.data.token, response.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-4xl font-bold mb-2" style={{ color: theme.colors.primary }}>
            Welcome to Henry Hu's Stock Trading
          </h1>
          <p className="text-center text-lg mb-6" style={{ color: theme.colors.textSecondary }}>
            Let's Earn Money Together. YEAH! :)
          </p>
          <h2 className="mt-6 text-center text-3xl font-extrabold mb-2" style={{ color: theme.colors.text }}>
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm" style={{ color: theme.colors.textSecondary }}>
            Or{' '}
            <Link to="/register" className="font-medium hover:opacity-80" style={{ color: theme.colors.primary }}>
              create a new account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-2 focus:z-10 sm:text-sm"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                style={{
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text
                }}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-2 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                style={{
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text
                }}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-center" style={{ color: theme.colors.error }}>
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 