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

export interface KYCDocument {
  id: string;
  userId: string;
  documentType: string;
  documentUrl: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KYCStatus {
  id: string;
  email: string;
  kycLevel: number;
  kycStatus: string;
  kycVerifiedAt?: string;
  kycNotes?: string;
  documents: KYCDocument[];
}

// Account KYC API
export const kycAPI = {
  // Upload KYC document
  uploadDocument: async (params: {
    documentType: string;
    documentUrl: string;
  }): Promise<KYCDocument> => {
    const response = await api.post('/account/kyc/documents', params);
    return response.data;
  },

  // Get KYC status
  getStatus: async (): Promise<KYCStatus> => {
    const response = await api.get('/account/kyc/status');
    return response.data;
  },

  // Get user documents
  getDocuments: async (): Promise<KYCDocument[]> => {
    const response = await api.get('/account/kyc/documents');
    return response.data.data || response.data;
  },
};

// Admin KYC API
export const adminKYCAPI = {
  // Verify document
  verifyDocument: (documentId: string, params: {
    status: 'verified' | 'rejected';
    rejectionReason?: string;
  }) => {
    return api.patch(`/admin/kyc/documents/${documentId}/verify`, params);
  },

  // Update user KYC level
  updateKYCLevel: (userId: string, params: {
    kycLevel: number;
    kycStatus: string;
    notes?: string;
  }) => {
    return api.patch(`/admin/kyc/users/${userId}/kyc-level`, params);
  },

  // Review AML transaction
  reviewAMLTransaction: (transactionId: string, params: {
    reviewStatus: 'cleared' | 'blocked';
    notes?: string;
  }) => {
    return api.patch(`/admin/kyc/aml-transactions/${transactionId}/review`, params);
  },

  // Get pending documents
  getPendingDocuments: (params?: { page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `/admin/kyc/documents/pending${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return api.get(url);
  },
};

