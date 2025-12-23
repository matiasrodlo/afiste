/**
 * Payment API Client
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v2';

const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

export interface DepositParams {
  amount: number;
  bankAccountId: string;
  currency?: string;
}

export interface WithdrawalParams {
  amount: number;
  bankAccountId: string;
  currency?: string;
}

export interface BankAccount {
  id: string;
  accountType: string;
  accountNumber: string;
  bankName: string;
  accountName: string;
  verified: boolean;
  isDefault: boolean;
  createdAt: string;
}

export const paymentsAPI = {
  /**
   * Create deposit
   */
  createDeposit: async (params: DepositParams) => {
    const token = getAuthToken();
    const response = await axios.post(
      `${API_BASE_URL}/account/payments/deposit`,
      params,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Create withdrawal
   */
  createWithdrawal: async (params: WithdrawalParams) => {
    const token = getAuthToken();
    const response = await axios.post(
      `${API_BASE_URL}/account/payments/withdraw`,
      params,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Get payment history
   */
  getPaymentHistory: async (limit: number = 50, offset: number = 0) => {
    const token = getAuthToken();
    const response = await axios.get(
      `${API_BASE_URL}/account/payments?limit=${limit}&offset=${offset}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Get payment details
   */
  getPayment: async (paymentId: string) => {
    const token = getAuthToken();
    const response = await axios.get(
      `${API_BASE_URL}/account/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Create Plaid link token
   */
  createLinkToken: async () => {
    const token = getAuthToken();
    const response = await axios.post(
      `${API_BASE_URL}/account/payments/bank-accounts/link-token`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Exchange public token
   */
  exchangePublicToken: async (publicToken: string) => {
    const token = getAuthToken();
    const response = await axios.post(
      `${API_BASE_URL}/account/payments/bank-accounts/exchange-token`,
      { publicToken },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Get bank accounts
   */
  getBankAccounts: async (): Promise<BankAccount[]> => {
    const token = getAuthToken();
    const response = await axios.get(
      `${API_BASE_URL}/account/payments/bank-accounts`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Verify bank account
   */
  verifyBankAccount: async (bankAccountId: string, amounts: number[]) => {
    const token = getAuthToken();
    const response = await axios.post(
      `${API_BASE_URL}/account/payments/bank-accounts/${bankAccountId}/verify`,
      { amounts },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Set default bank account
   */
  setDefaultBankAccount: async (bankAccountId: string) => {
    const token = getAuthToken();
    const response = await axios.put(
      `${API_BASE_URL}/account/payments/bank-accounts/${bankAccountId}/default`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  /**
   * Remove bank account
   */
  removeBankAccount: async (bankAccountId: string) => {
    const token = getAuthToken();
    const response = await axios.delete(
      `${API_BASE_URL}/account/payments/bank-accounts/${bankAccountId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },
};

