import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  LineController,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';
import { API_ENDPOINTS } from '../config/api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  LineController,
  Title,
  Tooltip,
  Legend
);

const EarningsChart = () => {
  const [earningsData, setEarningsData] = useState(null);
  const [stockEarningsData, setStockEarningsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState('by-stock'); // Always use by-stock view
  const { theme } = useTheme();

  // Generate year options (from 2030 down to current year - 5)
  const yearOptions = [];
  const currentYear = new Date().getFullYear();
  for (let year = 2030; year >= currentYear - 5; year--) {
    yearOptions.push(year);
  }

  const fetchStockEarningsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }

      console.log('Fetching stock earnings data for year:', selectedYear);
      const response = await axios.get(`${API_ENDPOINTS.EARNINGS_BY_STOCK}?year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Stock earnings data response:', response.data);
      setStockEarningsData(response.data);
    } catch (err) {
      console.error('Error fetching stock earnings data:', err);
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else {
        setError('Failed to load stock earnings data. Please try again.');
      }
    }
  };

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      console.log('Token length:', token ? token.length : 0);
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }
      
      console.log('Making request to:', `${API_ENDPOINTS.EARNINGS}?year=${selectedYear}`);
      console.log('API_BASE_URL:', process.env.REACT_APP_API_URL);
      
      const response = await axios.get(`${API_ENDPOINTS.EARNINGS}?year=${selectedYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      console.log('Response data type:', typeof response.data);
      console.log('Response data keys:', Object.keys(response.data));
      
      // Check if response.data has the expected structure
      if (!response.data || typeof response.data !== 'object') {
        console.error('Unexpected response format:', response.data);
        setError('Invalid response format from server');
        return;
      }
      
      // Validate the expected properties
      if (!response.data.monthlyEarnings || !Array.isArray(response.data.monthlyEarnings)) {
        console.error('Missing or invalid monthlyEarnings data:', response.data);
        console.error('monthlyEarnings type:', typeof response.data.monthlyEarnings);
        console.error('monthlyEarnings is array:', Array.isArray(response.data.monthlyEarnings));
        setError('Invalid earnings data format from server');
        return;
      }
      
      console.log('Setting earnings data:', response.data);
      console.log('Total earnings:', response.data.totalEarnings);
      console.log('Monthly earnings count:', response.data.monthlyEarnings.length);
      setEarningsData(response.data);
    } catch (err) {
      console.error('Error fetching earnings data:', err);
      console.error('Error response:', err.response);
      console.error('Error message:', err.message);
      
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('Access denied. Please check your permissions.');
      } else if (err.response?.status === 404) {
        setError('Earnings data not found for the selected year.');
      } else {
        setError('Failed to load earnings data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([
        fetchEarningsData(),
        fetchStockEarningsData()
      ]);
      setLoading(false);
    };
    fetchData();
  }, [selectedYear]);

  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading earnings data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-500 text-lg">{error}</div>
      </div>
    );
  }

  if (!stockEarningsData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">No earnings data available</div>
      </div>
    );
  }

  // Generate distinct colors for each stock
  const generateStockColors = (stocks) => {
    const colors = [
      '#8B5CF6', '#06D6A0', '#F59E0B', '#EF4444', '#3B82F6', 
      '#10B981', '#F97316', '#8B5CF6', '#EC4899', '#6366F1'
    ];
    return stocks.map((_, index) => colors[index % colors.length]);
  };

  // Prepare chart data for by-stock view
  const currentData = stockEarningsData;
  const stocks = stockEarningsData.stocks || [];
  const colors = generateStockColors(stocks);
  
  const datasets = stocks.map((stock, index) => ({
    label: stock,
    data: stockEarningsData.monthlyData.map(month => 
      month.stockEarnings[stock] || 0
    ),
    backgroundColor: colors[index],
    borderColor: colors[index],
    borderWidth: 1,
    borderRadius: 2,
  }));

  // Add total line if there are multiple stocks
  if (stocks.length > 1) {
    datasets.push({
      label: 'Total Monthly Earnings',
      data: stockEarningsData.monthlyData.map(month => month.totalEarnings),
      type: 'line',
      borderColor: theme.colors.text,
      backgroundColor: 'transparent',
      borderWidth: 3,
      pointBackgroundColor: theme.colors.text,
      pointBorderColor: theme.colors.text,
      pointRadius: 5,
      tension: 0.1,
    });
  }

  const chartData = {
    labels: stockEarningsData.monthlyData.map(item => item.month),
    datasets: datasets,
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          color: theme.colors.text,
          font: {
            size: 14,
          },
        },
      },
      title: {
        display: true,
        text: `Monthly Earnings by Stock - ${currentData.year}`,
        color: theme.colors.text,
        font: {
          size: 18,
          weight: 'bold',
        },
      },
      tooltip: {
        backgroundColor: theme.colors.surface,
        titleColor: theme.colors.text,
        bodyColor: theme.colors.text,
        borderColor: theme.colors.border,
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        ticks: {
          color: theme.colors.textSecondary,
          font: {
            size: 12,
          },
        },
        grid: {
          color: theme.colors.border,
        },
      },
      y: {
        stacked: true,
        ticks: {
          color: theme.colors.textSecondary,
          font: {
            size: 12,
          },
          callback: function(value) {
            return `$${value}`;
          },
        },
        grid: {
          color: theme.colors.border,
        },
      },
    },
  };

  // Use stock earnings data (always by-stock view)
  const currentTotalEarnings = stockEarningsData ? stockEarningsData.totalEarnings : 0;
  const hasEarnings = currentTotalEarnings > 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6" style={{ backgroundColor: theme.colors.card }}>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-bold mb-4 md:mb-0" style={{ color: theme.colors.text }}>
          Annual Earnings Chart
        </h2>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium" style={{ color: theme.colors.text }}>
            Select Year:
          </label>
            <select
              id="year-selector"
              name="year-selector"
              value={selectedYear}
              onChange={handleYearChange}
              className="px-3 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              style={{
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }}
            >
              {yearOptions.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
        </div>
      </div>

      {!hasEarnings ? (
        <div className="text-center py-12">
          <div className="text-lg mb-2" style={{ color: theme.colors.textSecondary }}>
            No earnings data for {selectedYear}
          </div>
          <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
            Start selling shares to see your earnings chart
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: theme.colors.surface }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                  Total Earnings ({selectedYear})
                </div>
                <div className="text-2xl font-bold" style={{ 
                  color: currentTotalEarnings >= 0 ? theme.colors.success : theme.colors.error 
                }}>
                  ${currentTotalEarnings.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                  Stocks with Earnings
                </div>
                <div className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                  {stockEarningsData?.stocks?.length || 0}
                </div>
              </div>
              <div>
                <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                  Average Monthly
                </div>
                <div className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                  ${(currentTotalEarnings / 12).toFixed(2)}
                </div>
              </div>
            </div>
            
            {/* Show stock breakdown */}
            {stockEarningsData && stockEarningsData.stocks && stockEarningsData.stocks.length > 0 && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.colors.border }}>
                <h4 className="text-sm font-medium mb-2" style={{ color: theme.colors.text }}>
                  Total Earnings by Stock:
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {stockEarningsData.stocks.map((stock, index) => {
                    const stockTotal = stockEarningsData.monthlyData.reduce(
                      (sum, month) => sum + (month.stockEarnings[stock] || 0), 0
                    );
                    const colors = generateStockColors(stockEarningsData.stocks);
                    return (
                      <div key={stock} className="text-center p-2 rounded" style={{ backgroundColor: theme.colors.card }}>
                        <div 
                          className="w-3 h-3 rounded-full mx-auto mb-1" 
                          style={{ backgroundColor: colors[index] }}
                        ></div>
                        <div className="text-xs font-medium" style={{ color: theme.colors.text }}>
                          {stock}
                        </div>
                        <div className="text-sm font-bold" style={{ 
                          color: stockTotal >= 0 ? theme.colors.success : theme.colors.error 
                        }}>
                          ${stockTotal.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="h-80">
            <Bar data={chartData} options={chartOptions} />
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3" style={{ color: theme.colors.text }}>
              Monthly Breakdown
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {earningsData.monthlyEarnings.map((month, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg text-center"
                  style={{ backgroundColor: theme.colors.surface }}
                >
                  <div className="text-sm font-medium" style={{ color: theme.colors.textSecondary }}>
                    {month.month}
                  </div>
                  <div className="text-lg font-bold" style={{ 
                    color: month.earnings >= 0 ? theme.colors.success : theme.colors.error 
                  }}>
                    ${month.earnings.toFixed(2)}
                  </div>
                  <div className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    {month.transactions} transactions
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EarningsChart; 