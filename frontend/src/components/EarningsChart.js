import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const EarningsChart = () => {
  const [earningsData, setEarningsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { theme } = useTheme();

  // Generate year options (current year and previous 5 years)
  const yearOptions = [];
  const currentYear = new Date().getFullYear();
  for (let year = currentYear; year >= currentYear - 5; year--) {
    yearOptions.push(year);
  }

  const fetchEarningsData = async (year) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3001/api/earnings/monthly?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setEarningsData(response.data);
    } catch (err) {
      setError('Failed to load earnings data');
      console.error('Error fetching earnings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarningsData(selectedYear);
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

  if (!earningsData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">No earnings data available</div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = {
    labels: earningsData.monthlyEarnings.map(item => item.month),
    datasets: [
      {
        label: 'Monthly Earnings ($)',
        data: earningsData.monthlyEarnings.map(item => item.earnings),
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.secondary,
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
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
        text: `Annual Earnings - ${earningsData.year}`,
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
            return `Earnings: $${context.parsed.y.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
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

  const totalEarnings = earningsData.totalEarnings;
  const hasEarnings = totalEarnings > 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6" style={{ backgroundColor: theme.colors.card }}>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-bold mb-4 md:mb-0" style={{ color: theme.colors.text }}>
          Annual Earnings Chart
        </h2>
        
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium" style={{ color: theme.colors.text }}>
            Select Year:
          </label>
          <select
            value={selectedYear}
            onChange={handleYearChange}
            className="px-3 py-2 border rounded-md text-sm"
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
                  color: totalEarnings >= 0 ? theme.colors.success : theme.colors.error 
                }}>
                  ${totalEarnings.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                  Total Transactions
                </div>
                <div className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                  {earningsData.monthlyEarnings.reduce((sum, month) => sum + month.transactions, 0)}
                </div>
              </div>
              <div>
                <div className="text-sm" style={{ color: theme.colors.textSecondary }}>
                  Average Monthly
                </div>
                <div className="text-2xl font-bold" style={{ color: theme.colors.text }}>
                  ${(totalEarnings / 12).toFixed(2)}
                </div>
              </div>
            </div>
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