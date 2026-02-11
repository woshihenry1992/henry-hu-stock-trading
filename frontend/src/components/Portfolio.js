import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AddTransaction from './AddTransaction';
import TransactionHistory from './TransactionHistory';
import SellShares from './SellShares';
import StockTransactionHistory from './StockTransactionHistory';
import { useTheme } from '../contexts/ThemeContext';
import { API_ENDPOINTS } from '../config/api';

const Portfolio = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStock, setSelectedStock] = useState(null);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [showSellForm, setShowSellForm] = useState(false);
  const [showStockTransactionHistory, setShowStockTransactionHistory] = useState(false);
  const [transactionType, setTransactionType] = useState('buy');
  const [editingStock, setEditingStock] = useState(null);
  const [newStockName, setNewStockName] = useState('');

  // Track user-entered current prices per stock (by stock.id)
  const [currentPrices, setCurrentPrices] = useState({});

  // Filter and sort settings for percentage drop
  const [dropFilter, setDropFilter] = useState('all'); // 'all', '0', '5', '10', '20', '30'
  const [dropSort, setDropSort] = useState('none'); // 'none', 'asc', 'desc'

  const { theme } = useTheme();

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(API_ENDPOINTS.PORTFOLIO, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPortfolio(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load portfolio');
      console.error('Error fetching portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleTransactionAdded = () => {
    fetchPortfolio();
    setShowTransactionForm(false);
    setShowSellForm(false);
    setSelectedStock(null);
  };

  const openTransactionForm = (stock, type = 'buy') => {
    setSelectedStock(stock);
    setTransactionType(type);
    if (type === 'sell') {
      setShowSellForm(true);
    } else {
      setShowTransactionForm(true);
    }
  };

  const handleRenameStock = async (stockId) => {
    if (!newStockName.trim()) {
      alert('Please enter a valid stock name');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_ENDPOINTS.STOCKS}/${stockId}`, 
        { stock_name: newStockName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      await fetchPortfolio();
      setEditingStock(null);
      setNewStockName('');
    } catch (err) {
      console.error('Error renaming stock:', err);
      alert('Failed to rename stock');
    }
  };

  const handleDeleteStock = async (stockId, stockName) => {
    if (!window.confirm(`Are you sure you want to delete "${stockName}"? This will remove all related transactions and cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_ENDPOINTS.STOCKS}/${stockId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await fetchPortfolio();
    } catch (err) {
      console.error('Error deleting stock:', err);
      alert('Failed to delete stock');
    }
  };

  const startRename = (stock) => {
    setEditingStock(stock.id);
    setNewStockName(stock.stock_name);
  };

  const cancelRename = () => {
    setEditingStock(null);
    setNewStockName('');
  };

  // Handle current price input change
  const handleCurrentPriceChange = (stockId, value) => {
    setCurrentPrices(prev => ({
      ...prev,
      [stockId]: value
    }));
  };

  // Calculate percentage drop for a given stock based on current price vs average buy price
  // Returns null if current price is not set or invalid
  const getPercentageDrop = (stock) => {
    const currentPriceRaw = currentPrices[stock.id];
    const currentPrice = parseFloat(currentPriceRaw);
    const avgBuy = parseFloat(stock.avg_buy_price);

    if (!currentPrice || !avgBuy || avgBuy === 0) {
      return null;
    }

    // Positive value means price has dropped below average buy
    const dropPercent = ((avgBuy - currentPrice) / avgBuy) * 100;
    return dropPercent;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading portfolio...</div>
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

  // Apply drop-based filter and sorting
  const enhancedPortfolio = (portfolio || [])
    .map((stock) => {
      const dropPercent = getPercentageDrop(stock);
      return { ...stock, dropPercent };
    })
    .filter((stock) => {
      if (dropFilter === 'all') return true;

      const threshold = parseFloat(dropFilter);
      if (Number.isNaN(threshold)) return true;

      // If no current price / drop is set, exclude when filtering by threshold
      if (stock.dropPercent === null || stock.dropPercent === undefined) return false;

      // Keep stocks whose drop is greater than or equal to the threshold
      return stock.dropPercent >= threshold;
    })
    .sort((a, b) => {
      if (dropSort === 'none') return 0;

      const aDrop = a.dropPercent;
      const bDrop = b.dropPercent;

      // Stocks without drop info should be pushed to the end
      if (aDrop == null && bDrop == null) return 0;
      if (aDrop == null) return 1;
      if (bDrop == null) return -1;

      if (dropSort === 'asc') {
        return aDrop - bDrop;
      }
      if (dropSort === 'desc') {
        return bDrop - aDrop;
      }
      return 0;
    });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Your Portfolio</h2>
      </div>

      {/* Percentage Drop Filters & Sorting */}
      {portfolio.length > 0 && (
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.textSecondary }}>
              Filter by Drop vs Avg Buy
            </label>
            <select
              value={dropFilter}
              onChange={(e) => setDropFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
              style={{
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
                color: theme.colors.text
              }}
            >
              <option value="all">All stocks</option>
              <option value="0">Drop ≥ 0%</option>
              <option value="5">Drop ≥ 5%</option>
              <option value="10">Drop ≥ 10%</option>
              <option value="20">Drop ≥ 20%</option>
              <option value="30">Drop ≥ 30%</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: theme.colors.textSecondary }}>
              Sort by Drop
            </label>
            <select
              value={dropSort}
              onChange={(e) => setDropSort(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
              style={{
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
                color: theme.colors.text
              }}
            >
              <option value="none">No drop sorting</option>
              <option value="desc">Largest drop first</option>
              <option value="asc">Smallest drop first</option>
            </select>
          </div>

          <div className="text-xs text-gray-500 mt-2">
            Enter a <span className="font-semibold">Current Price</span> for each stock card to see its drop and enable filtering.
          </div>
        </div>
      )}

      {portfolio.length === 0 ? (
        <div className="border rounded-md p-8 text-center" style={{ 
          backgroundColor: theme.colors.surface, 
          borderColor: theme.colors.border 
        }}>
          <h3 className="text-lg font-medium mb-2" style={{ color: theme.colors.text }}>No stocks yet</h3>
          <p style={{ color: theme.colors.textSecondary }}>Add your first stock to start tracking your investments!</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {enhancedPortfolio.map((stock) => {
            const dropPercent = stock.dropPercent;
            const hasDrop = dropPercent !== null && dropPercent !== undefined;
            const dropIsLoss = hasDrop && dropPercent > 0;
            const dropDisplayColor = !hasDrop
              ? theme.colors.textSecondary
              : dropIsLoss
                ? theme.colors.error
                : theme.colors.success;

            return (
            <div key={stock.id} className="rounded-lg shadow-md p-6" style={{ backgroundColor: theme.colors.card }}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 flex-1">
                  {editingStock === stock.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={newStockName}
                        onChange={(e) => setNewStockName(e.target.value)}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                        style={{ 
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.surface,
                          color: theme.colors.text
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleRenameStock(stock.id);
                          } else if (e.key === 'Escape') {
                            cancelRename();
                          }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleRenameStock(stock.id)}
                        className="px-2 py-1 text-xs rounded hover:opacity-80"
                        style={{ backgroundColor: theme.colors.success, color: 'white' }}
                      >
                        ✓
                      </button>
                      <button
                        onClick={cancelRename}
                        className="px-2 py-1 text-xs rounded hover:opacity-80"
                        style={{ backgroundColor: theme.colors.error, color: 'white' }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xl font-semibold" style={{ color: theme.colors.text }}>
                        {stock.stock_name}
                      </h3>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => startRename(stock)}
                          className="p-1 rounded hover:bg-gray-200 transition-colors"
                          title="Rename stock"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteStock(stock.id, stock.stock_name)}
                          className="p-1 rounded hover:bg-gray-200 transition-colors"
                          title="Delete stock"
                          style={{ color: theme.colors.error }}
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-medium ml-2" style={{
                  backgroundColor: stock.current_shares > 0 ? theme.colors.success + '20' : theme.colors.border,
                  color: stock.current_shares > 0 ? theme.colors.success : theme.colors.textSecondary
                }}>
                  {stock.current_shares > 0 ? 'Active' : 'No Shares'}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: theme.colors.textSecondary }}>Current Shares:</span>
                  <span className="font-medium" style={{ color: theme.colors.text }}>{stock.current_shares}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: theme.colors.textSecondary }}>Avg Buy Price:</span>
                  <span className="font-medium" style={{ color: theme.colors.text }}>${stock.avg_buy_price}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: theme.colors.textSecondary }}>Total Invested:</span>
                  <span className="font-medium" style={{ color: theme.colors.text }}>${stock.total_invested}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: theme.colors.textSecondary }}>Actual Earned:</span>
                  <span className="font-medium" style={{ 
                    color: stock.actual_earned >= 0 ? theme.colors.success : theme.colors.error 
                  }}>
                    ${stock.actual_earned}
                  </span>
                </div>

                {/* Current Price & Percentage Drop */}
                <div className="pt-2 border-t" style={{ borderColor: theme.colors.border }}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ color: theme.colors.textSecondary }}>Current Price ($):</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentPrices[stock.id] ?? ''}
                      onChange={(e) => handleCurrentPriceChange(stock.id, e.target.value)}
                      className="w-24 px-2 py-1 border rounded text-right text-xs"
                      style={{
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surface,
                        color: theme.colors.text
                      }}
                      placeholder="e.g. 40"
                    />
                  </div>
                  {hasDrop && (
                    <div className="flex justify-between">
                      <span style={{ color: theme.colors.textSecondary }}>Drop vs Avg Buy:</span>
                      <span className="font-medium" style={{ color: dropDisplayColor }}>
                        {dropIsLoss
                          ? `${dropPercent.toFixed(2)}% drop`
                          : `${Math.abs(dropPercent).toFixed(2)}% gain`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => openTransactionForm(stock, 'buy')}
                  className="flex-1 text-white py-2 px-3 rounded-md text-sm hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  Buy
                </button>
                <button
                  onClick={() => openTransactionForm(stock, 'sell')}
                  className="flex-1 text-white py-2 px-3 rounded-md text-sm hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: theme.colors.error }}
                >
                  Sell
                </button>
                <button
                  onClick={() => {
                    setSelectedStock(stock);
                    setShowStockTransactionHistory(true);
                  }}
                  className="flex-1 text-white py-2 px-3 rounded-md text-sm hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: theme.colors.info }}
                >
                  History
                </button>
              </div>
            </div>
          )})}
        </div>
      )}

      {showTransactionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="rounded-lg max-w-md w-full" style={{ backgroundColor: theme.colors.card }}>
            <AddTransaction 
              stock={selectedStock}
              onTransactionAdded={handleTransactionAdded}
              onClose={() => {
                setShowTransactionForm(false);
                setSelectedStock(null);
              }}
            />
          </div>
        </div>
      )}

      {showSellForm && selectedStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden">
            <SellShares 
              stock={selectedStock}
              onSharesSold={handleTransactionAdded}
              onClose={() => {
                setShowSellForm(false);
                setSelectedStock(null);
              }}
              onPortfolioRefresh={fetchPortfolio}
            />
          </div>
        </div>
      )}

      {showStockTransactionHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <StockTransactionHistory 
              stock={selectedStock}
              onClose={() => setShowStockTransactionHistory(false)}
              onPortfolioRefresh={fetchPortfolio}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Portfolio; 