// Balances API client
import apiClient from './auth';

export interface Balance {
  currency_id: string;
  balance: number;
  locked: number;
  available: number;
}

export const balancesAPI = {
  getBalances: async (currencyId?: string): Promise<Balance[]> => {
    const params = currencyId ? { currency_id: currencyId } : {};
    const response = await apiClient.get('/account/balances', { params });
    return response.data;
  },

  getBalance: async (currencyId: string): Promise<Balance> => {
    const response = await apiClient.get(`/account/balances/${currencyId}`);
    return response.data;
  },
};

