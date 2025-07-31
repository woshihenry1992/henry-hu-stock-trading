import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Navbar from './components/Navbar';
import BackgroundPattern from './components/BackgroundPattern';
import { ThemeProvider } from './contexts/ThemeContext';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app load
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <BackgroundPattern>
          <div className="App">
            {isAuthenticated && <Navbar user={user} onLogout={logout} />}
            <Routes>
              <Route 
                path="/login" 
                element={
                  isAuthenticated ? 
                  <Navigate to="/dashboard" /> : 
                  <Login onLogin={login} />
                } 
              />
              <Route 
                path="/register" 
                element={
                  isAuthenticated ? 
                  <Navigate to="/dashboard" /> : 
                  <Register onRegister={login} />
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  isAuthenticated ? 
                  <Dashboard user={user} /> : 
                  <Navigate to="/login" />
                } 
              />
              <Route 
                path="/" 
                element={
                  isAuthenticated ? 
                  <Navigate to="/dashboard" /> : 
                  <Navigate to="/login" />
                } 
              />
            </Routes>
          </div>
        </BackgroundPattern>
      </Router>
    </ThemeProvider>
  );
}

export default App;
