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

export interface FundFee {
  id: string;
  vcFundId: string;
  feeType: string;
  rate: number;
  calculationMethod: string;
  period: string;
  status: string;
  charges?: FeeCharge[];
}

export interface FeeCharge {
  id: string;
  feeId: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  currency: string;
  status: string;
  chargedAt?: string;
  notes?: string;
}

// Public Fees API
export const publicFeesAPI = {
  // Get fees for a fund
  getFundFees: async (fundId: string): Promise<FundFee[]> => {
    const response = await api.get(`/public/fees/funds/${fundId}`);
    return response.data.data || response.data;
  },
};

// Admin Fees API
export const adminFeesAPI = {
  // Create fee
  createFee: async (params: {
    vcFundId: string;
    feeType: string;
    rate: number;
    calculationMethod: string;
    period: string;
  }): Promise<FundFee> => {
    const response = await api.post('/admin/fees', params);
    return response.data;
  },

  // Charge fee
  chargeFee: (feeId: string, params: {
    periodStart: string;
    periodEnd: string;
  }) => {
    return api.post(`/admin/fees/${feeId}/charge`, params);
  },

  // Get fee charges
  getFeeCharges: (params?: {
    feeId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.feeId) queryParams.append('feeId', params.feeId);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/admin/fees/charges${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return api.get(url);
  },

  // Update charge status
  updateChargeStatus: (chargeId: string, status: string) => {
    return api.patch(`/admin/fees/charges/${chargeId}/status`, { status });
  },
};

