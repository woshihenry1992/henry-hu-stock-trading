import React, { useState } from 'react';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';
import { API_ENDPOINTS } from '../config/api';

const EditShareLot = ({ lot, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    shares: lot.shares,
    buy_price_per_share: lot.buy_price_per_share,
    buy_date: lot.buy_date.split('T')[0], // Convert to YYYY-MM-DD format
    buy_time: lot.buy_date.includes('T') && lot.buy_date.split('T')[1] 
      ? lot.buy_date.split('T')[1].substring(0, 5) // Extract HH:MM from ISO string
      : '00:00' // Default to 00:00 if no time present
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { theme } = useTheme();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      // Combine date and time into a datetime string
      const dateTimeString = `${formData.buy_date}T${formData.buy_time}:00`;
      const buyDateTime = new Date(dateTimeString).toISOString();
      
      const updateData = {
        shares: formData.shares,
        buy_price_per_share: formData.buy_price_per_share,
        buy_date: buyDateTime
      };
      
      const response = await axios.put(API_ENDPOINTS.EDIT_SHARE_LOT(lot.id), updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      onUpdate(response.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update share lot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
        style={{ backgroundColor: theme.colors.card }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold" style={{ color: theme.colors.text }}>
            Edit Share Lot
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            style={{ color: theme.colors.textSecondary }}
          >
            ✕
          </button>
        </div>

        <div className="mb-4 p-3 rounded" style={{ backgroundColor: theme.colors.surface }}>
          <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
            <strong>Shares:</strong> {lot.shares}
          </div>
          <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
            <strong>Current Buy Date:</strong> {lot.buy_date ? `${new Date(lot.buy_date).toLocaleDateString()} at ${new Date(lot.buy_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}` : 'N/A'}
          </div>
          <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
            <strong>Current Buy Price:</strong> ${lot.buy_price_per_share}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
              Buy Date
            </label>
            <input
              type="date"
              name="buy_date"
              value={formData.buy_date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md"
              style={{
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border
              }}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
              Buy Time (Hours:Minutes)
            </label>
            <input
              type="time"
              name="buy_time"
              value={formData.buy_time}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border rounded-md"
              style={{
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border
              }}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
              Buy Price per Share ($)
            </label>
            <input
              type="number"
              name="buy_price_per_share"
              value={formData.buy_price_per_share}
              onChange={handleChange}
              step="0.01"
              min="0.01"
              required
              className="w-full px-3 py-2 border rounded-md"
              style={{
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border
              }}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
              Number of Shares
            </label>
            <input
              type="number"
              name="shares"
              value={formData.shares}
              onChange={handleChange}
              min="1"
              step="1"
              required
              className="w-full px-3 py-2 border rounded-md"
              style={{
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border
              }}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded text-red-600 text-sm" style={{ backgroundColor: theme.colors.error + '20' }}>
              {error}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-md font-medium"
              style={{
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-md font-medium text-white"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {loading ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditShareLot; 