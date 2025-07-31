// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/api/login`,
  REGISTER: `${API_BASE_URL}/api/register`,
  PROFILE: `${API_BASE_URL}/api/profile`,
  STOCKS: `${API_BASE_URL}/api/stocks`,
  TRANSACTIONS: `${API_BASE_URL}/api/transactions`,
  PORTFOLIO: `${API_BASE_URL}/api/portfolio`,
  EARNINGS: `${API_BASE_URL}/api/earnings/monthly`,
  HEALTH: `${API_BASE_URL}/api/health`,
  SHARE_LOTS: (stockId) => `${API_BASE_URL}/api/stocks/${stockId}/share-lots`,
  SELL_LOTS: (stockId) => `${API_BASE_URL}/api/stocks/${stockId}/sell-lots`,
  EDIT_SHARE_LOT: (lotId) => `${API_BASE_URL}/api/share-lots/${lotId}`,
  DELETE_SHARE_LOT: (lotId) => `${API_BASE_URL}/api/share-lots/${lotId}`,
  DELETE_TRANSACTIONS: `${API_BASE_URL}/api/transactions`
};

export default API_BASE_URL; 