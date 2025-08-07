import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

const StockTransactionHistory = ({ stock, onClose }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, buy, sell
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'transaction_date', direction: 'desc' });

  useEffect(() => {
    fetchTransactions();
  }, [stock]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }
      
      const response = await axios.get(API_ENDPOINTS.TRANSACTIONS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Check if response.data is an array or has a transactions property
      let transactionsData;
      if (Array.isArray(response.data)) {
        transactionsData = response.data;
      } else if (response.data && Array.isArray(response.data.transactions)) {
        transactionsData = response.data.transactions;
      } else {
        console.error('Unexpected response format:', response.data);
        setError('Invalid response format from server');
        return;
      }
      
      // Filter transactions for this specific stock
      const stockTransactions = transactionsData.filter(t => t.stock_id === stock.id);
      setTransactions(stockTransactions);
      setError('');
    } catch (err) {
      console.error('Error fetching transactions:', err);
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('Access denied. Please check your permissions.');
      } else {
        setError('Failed to load transactions. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

    const handleSelectTransaction = (transactionId) => {
    // Only allow selecting sell transactions
    const transaction = sortedTransactions.find(t => t.id === transactionId);
    if (transaction && transaction.transaction_type !== 'sell') {
      return; // Don't allow selecting buy transactions
    }
    
    setSelectedTransactions(prev =>
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTransactions.length === sellTransactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(sellTransactions.map(t => t.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedTransactions.length === 0) return;
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(API_ENDPOINTS.DELETE_TRANSACTIONS, {
        headers: { Authorization: `Bearer ${token}` },
        data: { transactionIds: selectedTransactions }
      });
      
      // Refresh transactions
      await fetchTransactions();
      setSelectedTransactions([]);
      
      // Refresh portfolio if callback provided
      // if (onPortfolioRefresh) {
      //   onPortfolioRefresh();
      // }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete transactions');
    } finally {
      setDeleting(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.transaction_type === filter;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    if (sortConfig.key === 'transaction_date') {
      return sortConfig.direction === 'asc' 
        ? new Date(aValue) - new Date(bValue)
        : new Date(bValue) - new Date(aValue);
    }
    
    if (sortConfig.key === 'earned_amount' || sortConfig.key === 'price_per_share' || sortConfig.key === 'total_amount') {
      return sortConfig.direction === 'asc' 
        ? parseFloat(aValue) - parseFloat(bValue)
        : parseFloat(bValue) - parseFloat(aValue);
    }
    
    if (sortConfig.key === 'shares') {
      return sortConfig.direction === 'asc' 
        ? parseInt(aValue) - parseInt(bValue)
        : parseInt(bValue) - parseInt(aValue);
    }
    
    return sortConfig.direction === 'asc' 
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue));
  });

  // Filter only sell transactions for deletion
  const sellTransactions = sortedTransactions.filter(t => t.transaction_type === 'sell');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading transactions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {stock.stock_name} - Transaction History
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
      
      {/* Information about deletion rules */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <div className="text-sm text-blue-800">
          <strong>Note:</strong> Only sell transactions can be deleted from this page. 
          Buy transactions can only be removed by deleting their corresponding shares from the Sell page.
        </div>
      </div>

      {/* Actions */}
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Type
            </label>
            <select
              id="transaction-filter"
              name="transaction-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Transactions</option>
              <option value="buy">Buy Only</option>
              <option value="sell">Sell Only</option>
            </select>
          </div>
          
                  {selectedTransactions.length > 0 && (
          <button
            onClick={handleDeleteSelected}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : `Delete Selected (${selectedTransactions.length})`}
          </button>
        )}
        {sellTransactions.length === 0 && (
          <div className="text-sm text-gray-500 italic">
            No sell transactions to delete. Buy transactions can only be deleted from the Sell page.
          </div>
        )}
        </div>
      </div>

      {sortedTransactions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No transactions found for {stock.stock_name}.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    id="select-all-transactions"
                    name="select-all-transactions"
                    type="checkbox"
                    checked={selectedTransactions.length === sellTransactions.length && sellTransactions.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                    disabled={sellTransactions.length === 0}
                  />
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('transaction_date')}
                >
                  Date {sortConfig.key === 'transaction_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('transaction_type')}
                >
                  Type {sortConfig.key === 'transaction_type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('shares')}
                >
                  Shares {sortConfig.key === 'shares' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('price_per_share')}
                >
                  Price/Share {sortConfig.key === 'price_per_share' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('earned_amount')}
                >
                  Earned {sortConfig.key === 'earned_amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTransactions.map((transaction) => (
                <tr key={transaction.id} className={`${
                  selectedTransactions.includes(transaction.id) ? 'bg-blue-50' : ''
                } ${transaction.transaction_type !== 'sell' ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      id={`transaction-${transaction.id}`}
                      name={`transaction-${transaction.id}`}
                      type="checkbox"
                      checked={selectedTransactions.includes(transaction.id)}
                      onChange={() => handleSelectTransaction(transaction.id)}
                      disabled={transaction.transaction_type !== 'sell'}
                      className="rounded"
                      title={transaction.transaction_type !== 'sell' ? 'Buy transactions cannot be deleted from here. Delete them from the Sell page instead.' : ''}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(transaction.transaction_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      transaction.transaction_type === 'buy' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {transaction.transaction_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.shares}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${transaction.price_per_share}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.transaction_type === 'sell' ? (
                      <span className={transaction.earned_amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ${transaction.earned_amount ? parseFloat(transaction.earned_amount).toFixed(2) : '0.00'}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StockTransactionHistory; 