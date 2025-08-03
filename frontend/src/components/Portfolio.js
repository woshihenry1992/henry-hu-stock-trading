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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: theme.colors.text }}>Your Portfolio</h2>
      </div>

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
          {(portfolio || []).map((stock) => (
            <div key={stock.id} className="rounded-lg shadow-md p-6" style={{ backgroundColor: theme.colors.card }}>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold" style={{ color: theme.colors.text }}>{stock.stock_name}</h3>
                <span className="px-2 py-1 rounded-full text-xs font-medium" style={{
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
          ))}
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
          <div className="bg-white rounded-lg max-w-md w-full">
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