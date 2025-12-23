import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v2';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('auth_token') || localStorage.getItem('token');
};

// Create axios instance with auth
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const ordersAPI = {
  // Create order
  createOrder: (data: {
    market_id: string;
    side: 'buy' | 'sell';
    ord_type: 'limit' | 'market';
    price?: number;
    volume: number;
  }) => {
    return api.post('/account/orders', data);
  },

  // Get user orders
  getOrders: (params?: {
    market_id?: string;
    state?: string;
    limit?: number;
    offset?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.market_id) queryParams.append('market_id', params.market_id);
    if (params?.state) queryParams.append('state', params.state);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const url = `/account/orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return api.get(url);
  },

  // Get order details
  getOrder: (id: string) => {
    return api.get(`/account/orders/${id}`);
  },

  // Cancel order
  cancelOrder: (id: string) => {
    return api.post(`/account/orders/${id}/cancel`);
  },
};

