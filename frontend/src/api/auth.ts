// Authentication API client
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v2';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/public/auth/refresh_token`, {
            refreshToken: refreshToken,
          });
          
          const { token } = response.data;
          localStorage.setItem('auth_token', token);
          
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export interface RegisterParams {
  email: string;
  password: string;
  password_confirmation: string;
  first_name?: string;
  last_name?: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    kyc_level: number;
    role: string;
  };
  token: string;
  refresh_token?: string;
}

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  birth_date?: string;
  country?: string;
  city?: string;
  kyc_level: number;
  kyc_status: string;
  role: string;
  is_email_verified: boolean;
  created_at: string;
  updated_at: string;
}

// Auth API functions
export const authAPI = {
  register: async (params: RegisterParams): Promise<AuthResponse> => {
    // Transform snake_case to camelCase for backend
    const backendParams = {
      email: params.email,
      password: params.password,
      firstName: params.first_name,
      lastName: params.last_name,
    };
    const response = await apiClient.post('/public/auth/register', backendParams);
    const { user, token, refreshToken } = response.data;
    localStorage.setItem('auth_token', token);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    // Transform camelCase to snake_case for frontend
    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        kyc_level: user.kycLevel,
        role: user.role,
      },
      token,
      refresh_token: refreshToken,
    };
  },

  login: async (params: LoginParams): Promise<AuthResponse> => {
    const response = await apiClient.post('/public/auth/login', params);
    const { user, token, refreshToken } = response.data;
    localStorage.setItem('auth_token', token);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    // Transform camelCase to snake_case for frontend
    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        kyc_level: user.kycLevel,
        role: user.role,
      },
      token,
      refresh_token: refreshToken,
    };
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
  },

  refreshToken: async (refreshToken: string): Promise<{ token: string; refresh_token: string }> => {
    const response = await apiClient.post('/public/auth/refresh_token', {
      refreshToken: refreshToken,
    });
    const { token } = response.data;
    localStorage.setItem('auth_token', token);
    return {
      token,
      refresh_token: refreshToken, // Keep the same refresh token
    };
  },

  requestPasswordReset: async (email: string): Promise<void> => {
    await apiClient.post('/public/auth/password/reset', { email });
  },

  resetPassword: async (token: string, password: string, password_confirmation: string): Promise<void> => {
    await apiClient.post('/public/auth/password/reset/confirm', {
      token,
      password,
      password_confirmation,
    });
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get('/account/profile');
    const user = response.data;
    // Transform camelCase to snake_case
    return {
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      full_name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined,
      phone: user.phone,
      birth_date: user.birthDate,
      country: user.country,
      city: user.city,
      kyc_level: user.kycLevel,
      kyc_status: user.kycStatus,
      role: user.role,
      is_email_verified: user.isEmailVerified,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  },

  updateProfile: async (params: Partial<User>): Promise<User> => {
    // Transform snake_case to camelCase for backend
    const backendParams: any = {};
    if (params.first_name !== undefined) backendParams.firstName = params.first_name;
    if (params.last_name !== undefined) backendParams.lastName = params.last_name;
    if (params.phone !== undefined) backendParams.phone = params.phone;
    if (params.birth_date !== undefined) backendParams.birthDate = params.birth_date;
    if (params.country !== undefined) backendParams.country = params.country;
    if (params.city !== undefined) backendParams.city = params.city;
    
    const response = await apiClient.put('/account/profile', backendParams);
    const user = response.data;
    // Transform camelCase to snake_case
    return {
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      full_name: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : undefined,
      phone: user.phone,
      birth_date: user.birthDate,
      country: user.country,
      city: user.city,
      kyc_level: user.kycLevel,
      kyc_status: user.kycStatus,
      role: user.role,
      is_email_verified: user.isEmailVerified,
      created_at: user.createdAt,
      updated_at: user.updatedAt,
    };
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('auth_token');
  },

  getToken: (): string | null => {
    return localStorage.getItem('auth_token');
  },
};

export default apiClient;

