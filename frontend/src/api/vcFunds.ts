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

// Add response interceptor to log errors in development
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[API INTERCEPTOR] Request failed:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
    }
    return Promise.reject(error);
  }
);

// Public VC Funds API
export const vcFundsAPI = {
  // Get list of VC funds
  getVCFunds: (params?: {
    status?: string;
    risk_level?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.risk_level) queryParams.append('risk_level', params.risk_level);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/public/vc_funds${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return api.get(url);
  },

  // Get VC fund details
  getVCFund: (id: string) => {
    return api.get(`/public/vc_funds/${id}`);
  },

  // Get VC fund portfolio companies
  getVCFundPortfolio: (id: string, params?: { sector?: string; stage?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.sector) queryParams.append('sector', params.sector);
    if (params?.stage) queryParams.append('stage', params.stage);

    const url = `/public/vc_funds/${id}/portfolio${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return api.get(url);
  },

  // Get VC fund performance records
  getVCFundPerformance: (
    id: string,
    params?: {
      start_date?: string;
      end_date?: string;
      limit?: number;
    },
  ) => {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/public/vc_funds/${id}/performance${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return api.get(url);
  },
};

// Account VC Investments API
export const vcInvestmentsAPI = {
  // Get user investment summary
  getInvestments: () => {
    return api.get('/account/investments');
  },

  // Create investment in a VC fund
  createInvestment: (vcFundId: string, amount: number) => {
    return api.post('/account/investments', {
      vc_fund_id: vcFundId,
      amount: amount,
    });
  },

  // Get investment details for a currency
  getInvestment: (currencyId: string) => {
    return api.get(`/account/investments/${currencyId}`);
  },

  // Get user portfolio (deprecated - use portfolioAPI instead)
  getPortfolio: () => {
    return api.get('/account/investments');
  },
};

// Admin VC Funds API
export const adminVCFundsAPI = {
  // Get list of VC funds (admin)
  getVCFunds: (params?: { status?: string; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/admin/vc_funds${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return api.get(url);
  },

  // Get VC fund details (admin)
  getVCFund: (id: string) => {
    return api.get(`/admin/vc_funds/${id}`);
  },

  // Create VC fund
  createVCFund: async (data: {
    name: string;
    manager: string;
    total_supply: number;
    minimum_investment: number;
    description?: string;
    fund_size?: number;
    available_supply?: number;
    launch_date?: string;
    maturity_date?: string;
    status?: string;
    risk_level?: string;
    regulatory_status?: string;
    terms?: string;
    documents?: Record<string, string>;
    currency_id?: string;
    quote_currency?: string;
    initial_offering_price?: number;
    current_nav?: number;
  }) => {
    try {
      const response = await api.post('/admin/vc_funds', data);
      return response;
    } catch (error: any) {
      console.error('[FRONTEND DEBUG] API call failed:', error);
      console.error('[FRONTEND DEBUG] Error response:', error.response);
      console.error('[FRONTEND DEBUG] Error response data:', error.response?.data);
      throw error;
    }
  },

  // Update VC fund
  updateVCFund: (id: string, data: {
    name?: string;
    description?: string;
    status?: string;
    risk_level?: string;
    regulatory_status?: string;
    terms?: string;
    documents?: Record<string, string>;
  }) => {
    return api.put(`/admin/vc_funds/${id}`, data);
  },

  // Mint tokens
  mintTokens: (id: string, data: { amount: number; to_account_id: string }) => {
    return api.post(`/admin/vc_funds/${id}/tokens/mint`, data);
  },

  // Update NAV
  updateNAV: (id: string, data: {
    record_date?: string;
    total_assets?: number;
    total_liabilities?: number;
    performance_metrics?: Record<string, any>;
  }) => {
    return api.post(`/admin/vc_funds/${id}/update_nav`, data);
  },
};
