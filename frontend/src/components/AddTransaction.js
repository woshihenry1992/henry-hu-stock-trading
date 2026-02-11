import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const AddTransaction = ({ stock, onTransactionAdded, onClose }) => {
  const [availableStocks, setAvailableStocks] = useState([]);
  const [selectedStockId, setSelectedStockId] = useState(stock?.id || '');
  const [formData, setFormData] = useState({
    transaction_type: 'buy', // Always buy
    shares: '',
    price_per_share: '',
    transaction_date: new Date().toISOString().split('T')[0], // Default to today
    transaction_time: '00:00' // Default time
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStocks = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API_ENDPOINTS.STOCKS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Fix: Handle the response format properly
      const stocks = response.data.stocks || response.data || [];
      setAvailableStocks(stocks);
      if (!selectedStockId && stocks.length > 0) {
        setSelectedStockId(stocks[0].id);
      }
    } catch (err) {
      setError('Failed to load stocks');
      setAvailableStocks([]); // Ensure it's always an array
    }
  }, [selectedStockId]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

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
      const token = localStorage.getItem('token');
      // Combine date and time into a datetime string
      const dateTimeString = `${formData.transaction_date}T${formData.transaction_time}:00`;
      const transactionDateTime = new Date(dateTimeString).toISOString();
      
      await axios.post(API_ENDPOINTS.TRANSACTIONS, 
        {
          stock_id: selectedStockId,
          transaction_type: 'buy', // Always buy
          shares: parseInt(formData.shares),
          price_per_share: parseFloat(formData.price_per_share),
          transaction_date: transactionDateTime
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      onTransactionAdded();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Add Transaction
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stock
          </label>
          <select
            value={selectedStockId}
            onChange={(e) => setSelectedStockId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          >
            <option value="">Select a stock</option>
            {(availableStocks || []).map((stock) => (
              <option key={stock.id} value={stock.id}>
                {stock.stock_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="transaction_date" className="block text-sm font-medium text-gray-700 mb-2">
            Transaction Date
          </label>
          <input
            type="date"
            id="transaction_date"
            name="transaction_date"
            value={formData.transaction_date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        <div>
          <label htmlFor="transaction_time" className="block text-sm font-medium text-gray-700 mb-2">
            Transaction Time (Hours:Minutes)
          </label>
          <input
            type="time"
            id="transaction_time"
            name="transaction_time"
            value={formData.transaction_time}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        <div>
          <label htmlFor="shares" className="block text-sm font-medium text-gray-700 mb-2">
            Number of Shares
          </label>
          <input
            type="number"
            id="shares"
            name="shares"
            value={formData.shares}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., 10"
            min="1"
            step="1"
            required
          />
        </div>

        <div>
          <label htmlFor="price_per_share" className="block text-sm font-medium text-gray-700 mb-2">
            Price per Share ($)
          </label>
          <input
            type="number"
            id="price_per_share"
            name="price_per_share"
            value={formData.price_per_share}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., 150.50"
            min="0.01"
            step="0.01"
            required
          />
        </div>

        {formData.shares && formData.price_per_share && (
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-sm text-gray-600">
              Total Amount: <span className="font-medium">${(formData.shares * formData.price_per_share).toFixed(2)}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading || !selectedStockId || !formData.shares || !formData.price_per_share}
            className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add Transaction'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddTransaction; 