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

export interface TokenOffering {
  id: string;
  vcFundId: string;
  offeringType: string;
  startDate: string;
  endDate?: string;
  offeringPrice: number;
  minInvestment: number;
  maxInvestment?: number;
  totalTokensOffered: number;
  tokensSold: number;
  status: string;
  whitelistRequired: boolean;
  description?: string;
  vcFund?: {
    id: string;
    name: string;
    description?: string;
    manager: string;
    currentNav: number;
    currency?: {
      id: string;
      code: string;
      name: string;
    };
  };
}

export interface PurchaseTokensParams {
  amount: number;
}

export interface PurchaseTokensResponse {
  tokensPurchased: number;
  amountPaid: number;
  newBalance: number;
}

// Public Token Offerings API
export const publicTokenOfferingsAPI = {
  // Get list of active offerings
  getOfferings: (params?: {
    status?: string;
    vcFundId?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.vcFundId) queryParams.append('vcFundId', params.vcFundId);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/public/token_offerings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return api.get(url);
  },

  // Get offering details
  getOffering: (id: string) => {
    return api.get(`/public/token_offerings/${id}`);
  },

  // Get offering for a specific fund
  getOfferingByFund: async (vcFundId: string): Promise<TokenOffering | null> => {
    try {
      const response = await api.get(`/public/token_offerings?vcFundId=${vcFundId}&status=active`);
      const offerings = response.data.data || [];
      return offerings.length > 0 ? offerings[0] : null;
    } catch (error) {
      return null;
    }
  },
};

// Account Token Offerings API
export const accountTokenOfferingsAPI = {
  // Purchase tokens in an offering
  purchaseTokens: async (offeringId: string, params: PurchaseTokensParams): Promise<PurchaseTokensResponse> => {
    const response = await api.post(`/account/token_offerings/${offeringId}/purchase`, params);
    return response.data;
  },

  // Get user's allocations
  getMyAllocations: () => {
    return api.get('/account/token_offerings/my-allocations');
  },
};

// Admin Token Offerings API
export const adminTokenOfferingsAPI = {
  // Create offering
  createOffering: async (params: {
    vcFundId: string;
    offeringType?: string;
    startDate: string;
    endDate?: string;
    offeringPrice: number;
    minInvestment: number;
    maxInvestment?: number;
    totalTokensOffered: number;
    whitelistRequired?: boolean;
    description?: string;
  }): Promise<TokenOffering> => {
    const response = await api.post('/admin/token_offerings', params);
    return response.data;
  },

  // Get list of offerings
  getOfferings: (params?: {
    status?: string;
    vcFundId?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.vcFundId) queryParams.append('vcFundId', params.vcFundId);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/admin/token_offerings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return api.get(url);
  },

  // Get offering details
  getOffering: (id: string) => {
    return api.get(`/admin/token_offerings/${id}`);
  },

  // Update offering status
  updateStatus: (id: string, status: string) => {
    return api.patch(`/admin/token_offerings/${id}/status`, { status });
  },
};

