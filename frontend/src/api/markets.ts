import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v2';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests (for authenticated endpoints)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const marketsAPI = {
  // Get list of markets
  getMarkets: (params?: { state?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.state) queryParams.append('state', params.state);

    const url = `/public/markets${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return api.get(url);
  },

  // Get market details
  getMarket: (id: string) => {
    return api.get(`/public/markets/${id}`);
  },

  // Get order book
  getOrderBook: (market: string, limit: number = 20) => {
    return api.get(`/public/order_book/${market}?limit=${limit}`);
  },

  // Get trades
  getTrades: (market: string, params?: { limit?: number; offset?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const url = `/public/trades/${market}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return api.get(url);
  },

  // Get ticker
  getTicker: (market: string) => {
    return api.get(`/public/tickers/${market}`);
  },
};

