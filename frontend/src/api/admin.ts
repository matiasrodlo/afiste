// Admin API client
import apiClient from './auth';

export interface AdminUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  kyc_level: number;
  kyc_status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUserDetail extends AdminUser {
  accounts?: Array<{
    currency_id: string;
    balance: number;
    locked: number;
    currency: {
      id: string;
      code: string;
      name: string;
      symbol: string;
    };
  }>;
}

export interface UsersListResponse {
  data: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface UpdateKYCParams {
  kyc_level?: number;
  kyc_status?: 'pending' | 'verified' | 'rejected';
}

export const adminAPI = {
  // User management
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    kyc_status?: string;
    kyc_level?: number;
  }): Promise<UsersListResponse> => {
    const response = await apiClient.get('/admin/users', { params });
    return response.data;
  },

  getUser: async (userId: string): Promise<AdminUserDetail> => {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  },

  updateUserKYC: async (userId: string, params: UpdateKYCParams): Promise<AdminUser> => {
    const response = await apiClient.put(`/admin/users/${userId}/kyc_level`, params);
    return response.data;
  },
};

