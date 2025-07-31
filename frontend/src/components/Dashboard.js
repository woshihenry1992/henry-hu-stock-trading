import React, { useState } from 'react';
import AddStock from './AddStock';
import Portfolio from './Portfolio';
import EarningsChart from './EarningsChart';
import { useTheme } from '../contexts/ThemeContext';

const Dashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState('portfolio');
  const [stocks, setStocks] = useState([]);
  const { theme } = useTheme();

  const handleStockAdded = (newStock) => {
    setStocks([newStock, ...stocks]);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ color: theme.colors.text }}>
              Welcome back, {user?.username}!
            </h1>
            <p style={{ color: theme.colors.textSecondary }}>
              Manage your stock portfolio and track your investments.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-6" style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('portfolio')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'portfolio'
                    ? 'border-b-2'
                    : 'border-transparent hover:border-gray-300'
                }`}
                style={{
                  borderColor: activeTab === 'portfolio' ? theme.colors.primary : 'transparent',
                  color: activeTab === 'portfolio' ? theme.colors.primary : theme.colors.textSecondary
                }}
              >
                Portfolio
              </button>
              <button
                onClick={() => setActiveTab('earnings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'earnings'
                    ? 'border-b-2'
                    : 'border-transparent hover:border-gray-300'
                }`}
                style={{
                  borderColor: activeTab === 'earnings' ? theme.colors.primary : 'transparent',
                  color: activeTab === 'earnings' ? theme.colors.primary : theme.colors.textSecondary
                }}
              >
                Earnings Chart
              </button>
              <button
                onClick={() => setActiveTab('add-stock')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'add-stock'
                    ? 'border-b-2'
                    : 'border-transparent hover:border-gray-300'
                }`}
                style={{
                  borderColor: activeTab === 'add-stock' ? theme.colors.primary : 'transparent',
                  color: activeTab === 'add-stock' ? theme.colors.primary : theme.colors.textSecondary
                }}
              >
                Add Stock
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="overflow-hidden shadow rounded-lg" style={{ backgroundColor: theme.colors.card }}>
            <div className="px-4 py-5 sm:p-6">
              {activeTab === 'portfolio' ? (
                <Portfolio />
              ) : activeTab === 'earnings' ? (
                <EarningsChart />
              ) : (
                <AddStock onStockAdded={handleStockAdded} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 