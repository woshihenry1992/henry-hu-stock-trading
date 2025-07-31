import React, { useState } from 'react';
import axios from 'axios';

const AddStock = ({ onStockAdded }) => {
  const [stockName, setStockName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:3001/api/stocks', 
        { stock_name: stockName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Stock added successfully!');
      setStockName('');
      if (onStockAdded) {
        onStockAdded(response.data.stock);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Stock</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="stockName" className="block text-sm font-medium text-gray-700 mb-2">
            Stock Name
          </label>
          <input
            type="text"
            id="stockName"
            value={stockName}
            onChange={(e) => setStockName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., AAPL, GOOGL, TSLA"
            required
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="text-green-600 text-sm">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !stockName.trim()}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Adding...' : 'Add Stock'}
        </button>
      </form>
    </div>
  );
};

export default AddStock; 