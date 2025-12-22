import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import EditShareLot from './EditShareLot';
import { useTheme } from '../contexts/ThemeContext';

const SellShares = ({ stock, onSharesSold, onClose, onPortfolioRefresh }) => {
  const [shareLots, setShareLots] = useState([]);
  const [selectedLots, setSelectedLots] = useState([]);
  const [sellPrice, setSellPrice] = useState('');
  const [sellDate, setSellDate] = useState(new Date().toISOString().split('T')[0]);
  const [sellTime, setSellTime] = useState('00:00');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editingLot, setEditingLot] = useState(null);
  const [sortBy, setSortBy] = useState('date'); // 'date' or 'price'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh key
  const [updatingLot, setUpdatingLot] = useState(null); // Track which lot is being updated
  const [successMessage, setSuccessMessage] = useState(''); // Success message
  const [deletingLot, setDeletingLot] = useState(null); // Track which lot is being deleted
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // Show delete confirmation
  const [lotToDelete, setLotToDelete] = useState(null); // Lot to be deleted
  const { theme } = useTheme();

  useEffect(() => {
    fetchShareLots();
  }, [stock]);

  const fetchShareLots = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(API_ENDPOINTS.SHARE_LOTS(stock.id), {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Fetched share lots:', response.data.shareLots); // Debug log
      // Fix: Handle the response format properly
      const shareLotsData = response.data.shareLots || response.data || [];
      setShareLots(shareLotsData.filter(lot => lot.status === 'active'));
    } catch (err) {
      setError('Failed to load share lots');
      setShareLots([]); // Ensure it's always an array
    } finally {
      setLoading(false);
    }
  };

  const handleLotSelection = (lotId) => {
    setSelectedLots(prev => 
      prev.includes(lotId) 
        ? prev.filter(id => id !== lotId)
        : [...prev, lotId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLots.length === shareLots.length) {
      setSelectedLots([]);
    } else {
      setSelectedLots(shareLots.map(lot => lot.id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      // Combine date and time into a datetime string
      const dateTimeString = `${sellDate}T${sellTime}:00`;
      const sellDateTime = new Date(dateTimeString).toISOString();
      
      const response = await axios.post(API_ENDPOINTS.SELL_LOTS(stock.id), 
        {
          lotIds: selectedLots,
          sellPricePerShare: parseFloat(sellPrice),
          sellDate: sellDateTime
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      onSharesSold();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to sell shares');
    } finally {
      setSubmitting(false);
    }
  };

  const totalSelectedShares = shareLots
    .filter(lot => selectedLots.includes(lot.id))
    .reduce((sum, lot) => sum + lot.shares, 0);

  const totalSelectedValue = totalSelectedShares * (parseFloat(sellPrice) || 0);

  // Calculate average price of selected lots
  const selectedLotsData = shareLots.filter(lot => selectedLots.includes(lot.id));
  const totalCost = selectedLotsData.reduce((sum, lot) => sum + (lot.shares * lot.buy_price_per_share), 0);
  const averagePrice = totalSelectedShares > 0 ? totalCost / totalSelectedShares : 0;

  // Calculate estimated earnings
  const sellPriceNum = parseFloat(sellPrice) || 0;
  const estimatedEarnings = (sellPriceNum * totalSelectedShares) - (averagePrice * totalSelectedShares);

  // Generate user-friendly preview sentence
  const getPreviewSentence = () => {
    if (selectedLots.length === 0 || !sellPrice) return '';
    
    const earningsText = estimatedEarnings >= 0 ? `earn $${estimatedEarnings.toFixed(2)}` : `lose $${Math.abs(estimatedEarnings).toFixed(2)}`;
    return `By selling ${totalSelectedShares} shares at $${sellPriceNum.toFixed(2)} per share, you will ${earningsText}.`;
  };

  // Sort share lots based on current sort settings
  const sortedShareLots = [...shareLots].sort((a, b) => {
    let aValue, bValue;
    
    if (sortBy === 'date') {
      aValue = new Date(a.buy_date);
      bValue = new Date(b.buy_date);
    } else if (sortBy === 'price') {
      aValue = a.buy_price_per_share;
      bValue = b.buy_price_per_share;
    }
    
    if (sortOrder === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });

  const handleEditLot = (lot) => {
    setEditingLot(lot);
  };

  const handleUpdateLot = (updatedLot) => {
    console.log('Updating lot:', updatedLot); // Debug log
    
    // Set updating state
    setUpdatingLot(updatedLot.id);
    
    // Immediately update the local state with the new data
    setShareLots(prev => {
      const updated = prev.map(lot => 
        lot.id === updatedLot.id ? { ...lot, ...updatedLot } : lot
      );
      console.log('Updated share lots:', updated); // Debug log
      return updated;
    });
    
    // Force a re-render by updating the refresh key
    setRefreshKey(prev => prev + 1);
    
    // Refresh the portfolio to update the dashboard
    if (onPortfolioRefresh) {
      onPortfolioRefresh();
    }
    
    // Show success message
    setSuccessMessage('Share lot updated successfully! Dashboard refreshed.');
    
    // Clear updating state and success message after a delay
    setTimeout(() => {
      setUpdatingLot(null);
      setSuccessMessage('');
    }, 2000);
    
    setEditingLot(null);
  };

  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const handleDeleteLot = (lot) => {
    setLotToDelete(lot);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!lotToDelete) return;
    
    setDeletingLot(lotToDelete.id);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(API_ENDPOINTS.DELETE_SHARE_LOT(lotToDelete.id), {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh share lots
      await fetchShareLots();
      
      // Refresh portfolio if callback provided
      if (onPortfolioRefresh) {
        onPortfolioRefresh();
      }
      
      setSuccessMessage(`Deleted ${lotToDelete.shares} shares successfully!`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete share lot');
    } finally {
      setDeletingLot(null);
      setShowDeleteConfirm(false);
      setLotToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setLotToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading share lots...</div>
      </div>
    );
  }

  if (shareLots.length === 0) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Sell Shares - {stock.stock_name}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500">No shares available to sell.</p>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Sell Shares - {stock.stock_name}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Select All */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={selectedLots.length === shareLots.length}
            onChange={handleSelectAll}
            className="rounded"
          />
          <label className="text-sm font-medium text-gray-700">
            Select All ({shareLots.length} lots)
          </label>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center space-x-4 mb-3">
          <span className="text-sm font-medium" style={{ color: theme.colors.text }}>
            Sort by:
          </span>
          <button
            type="button"
            onClick={() => handleSortChange('date')}
            className={`px-3 py-1 text-sm rounded-md border ${
              sortBy === 'date' 
                ? 'text-white' 
                : 'text-gray-600'
            }`}
            style={{
              backgroundColor: sortBy === 'date' ? theme.colors.primary : theme.colors.surface,
              borderColor: theme.colors.border,
              color: sortBy === 'date' ? 'white' : theme.colors.textSecondary
            }}
          >
            Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            type="button"
            onClick={() => handleSortChange('price')}
            className={`px-3 py-1 text-sm rounded-md border ${
              sortBy === 'price' 
                ? 'text-white' 
                : 'text-gray-600'
            }`}
            style={{
              backgroundColor: sortBy === 'price' ? theme.colors.primary : theme.colors.surface,
              borderColor: theme.colors.border,
              color: sortBy === 'price' ? 'white' : theme.colors.textSecondary
            }}
          >
            Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>

        {/* Share Lots List */}
        <div key={refreshKey} className="max-h-64 overflow-y-auto border rounded-md" style={{ borderColor: theme.colors.border }}>
          {(sortedShareLots || []).map((lot) => (
                          <div key={lot.id} className={`flex items-center space-x-3 p-3 border-b last:border-b-0 ${updatingLot === lot.id ? 'bg-yellow-50' : ''}`} style={{ borderColor: theme.colors.border }}>
                <input
                  type="checkbox"
                  checked={selectedLots.includes(lot.id)}
                  onChange={() => handleLotSelection(lot.id)}
                  className="rounded"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium" style={{ color: theme.colors.text }}>
                      {lot.shares} shares {updatingLot === lot.id && <span className="text-xs text-yellow-600">(updating...)</span>}
                    </span>
                    <span className="text-sm" style={{ color: theme.colors.textSecondary }}>
                      Bought at ${lot.buy_price_per_share}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    Bought on {new Date(lot.buy_date).toLocaleDateString()} at {new Date(lot.buy_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleEditLot(lot)}
                    disabled={updatingLot === lot.id || deletingLot === lot.id}
                    className="px-2 py-1 text-xs rounded border"
                    style={{
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.primary,
                      borderColor: theme.colors.primary,
                      opacity: (updatingLot === lot.id || deletingLot === lot.id) ? 0.5 : 1
                    }}
                  >
                    {updatingLot === lot.id ? 'Updating...' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteLot(lot)}
                    disabled={updatingLot === lot.id || deletingLot === lot.id}
                    className="px-2 py-1 text-xs rounded border"
                    style={{
                      backgroundColor: theme.colors.surface,
                      color: theme.colors.error,
                      borderColor: theme.colors.error,
                      opacity: (updatingLot === lot.id || deletingLot === lot.id) ? 0.5 : 1
                    }}
                  >
                    {deletingLot === lot.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
          ))}
        </div>

        {/* Sell Details */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sell Price per Share ($)
            </label>
            <input
              type="number"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., 160.50"
              min="0.01"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sell Date
            </label>
            <input
              type="date"
              value={sellDate}
              onChange={(e) => setSellDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sell Time (Hours:Minutes)
          </label>
          <input
            type="time"
            value={sellTime}
            onChange={(e) => setSellTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>

        {/* Selling Preview Panel */}
        {selectedLots.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-md border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3">Selling Preview</h4>
            
            {/* Average Price Section */}
            <div className="mb-3">
              <div className="text-sm text-blue-700 mb-1">Average Price of Selected Lots:</div>
              <div className="text-lg font-semibold text-blue-900">
                ${averagePrice.toFixed(2)} per share
              </div>
            </div>

            {/* Estimated Earnings Section */}
            {sellPrice && (
              <div className="mb-3">
                <div className="text-sm text-blue-700 mb-1">Estimated Earnings:</div>
                <div className={`text-lg font-semibold ${estimatedEarnings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${estimatedEarnings.toFixed(2)}
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Formula: (${sellPriceNum.toFixed(2)} × {totalSelectedShares}) - (${averagePrice.toFixed(2)} × {totalSelectedShares})
                </div>
              </div>
            )}

            {/* User-friendly Preview Sentence */}
            {sellPrice && (
              <div className="mt-3 p-3 bg-white rounded border border-blue-300">
                <div className="text-sm text-blue-700 mb-1">Preview:</div>
                <div className="text-sm font-medium text-blue-900">
                  {getPreviewSentence()}
                </div>
              </div>
            )}

            {/* Basic Summary */}
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Selected Lots:</span>
                  <span className="ml-2 font-medium text-blue-900">{selectedLots.length}</span>
                </div>
                <div>
                  <span className="text-blue-700">Total Shares:</span>
                  <span className="ml-2 font-medium text-blue-900">{totalSelectedShares}</span>
                </div>
                {sellPrice && (
                  <>
                    <div>
                      <span className="text-blue-700">Sell Price:</span>
                      <span className="ml-2 font-medium text-blue-900">${sellPriceNum.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Total Value:</span>
                      <span className="ml-2 font-medium text-blue-900">${totalSelectedValue.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md border border-green-200">
            {successMessage}
          </div>
        )}

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={submitting || selectedLots.length === 0 || !sellPrice}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Selling...' : 'Sell Selected Shares'}
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

      {/* Edit Share Lot Modal */}
      {editingLot && (
        <EditShareLot
          lot={editingLot}
          onClose={() => setEditingLot(null)}
          onUpdate={handleUpdateLot}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && lotToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Confirm Delete</h2>
              <button
                onClick={cancelDelete}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4 p-3 rounded bg-gray-50">
              <div className="text-sm text-gray-700 mb-2">
                <strong>Shares:</strong> {lotToDelete.shares}
              </div>
              <div className="text-sm text-gray-700 mb-2">
                <strong>Buy Price:</strong> ${lotToDelete.buy_price_per_share}
              </div>
              <div className="text-sm text-gray-700">
                <strong>Buy Date:</strong> {new Date(lotToDelete.buy_date).toLocaleDateString()} at {new Date(lotToDelete.buy_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </div>
            </div>

            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this share transaction? This action cannot be undone.
            </p>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={cancelDelete}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingLot === lotToDelete.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deletingLot === lotToDelete.id ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellShares; 