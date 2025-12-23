import apiClient from './auth';
import { BlockchainTransaction } from '../components/BlockchainTransactions/BlockchainTransactions';

export const blockchainAPI = {
  /**
   * Get blockchain transaction history
   */
  getTransactionHistory: async (params?: {
    contractAddress?: string;
    status?: string;
    fromAddress?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ transactions: BlockchainTransaction[]; total: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.contractAddress) queryParams.append('contractAddress', params.contractAddress);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.fromAddress) queryParams.append('fromAddress', params.fromAddress);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const url = `/blockchain/transactions/history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  /**
   * Get blockchain transactions for a specific VC fund
   */
  getFundTransactions: async (
    fundId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<{ transactions: BlockchainTransaction[]; total: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const url = `/blockchain/transactions/fund/${fundId}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  /**
   * Get blockchain transaction by hash
   */
  getTransaction: async (txHash: string): Promise<any> => {
    const response = await apiClient.get(`/blockchain/transaction/${txHash}`);
    return response.data;
  },
};

