import { useCallback, useState } from 'react';
import { vcFundsAPI, vcInvestmentsAPI } from '../api/vcFunds';
import { portfolioAPI } from '../api/portfolio';
import { VCFund, VCFundDetail, VCFundPortfolioCompany, VCFundPerformanceRecord, InvestmentSummary, InvestmentDetail, Portfolio } from '../types/vcFund.types';

export const useVCFunds = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const getVCFunds = useCallback(async (params?: {
    status?: string;
    risk_level?: string;
    page?: number;
    limit?: number;
  }) => {
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const response = await vcFundsAPI.getVCFunds(params);
      // Backend returns { data: [...], pagination: {...}, warning?: "..." }
      const responseData = response.data;
      
      // Store warning if present (e.g., database unavailable)
      if (responseData?.warning) {
        setWarning(responseData.warning);
        if (process.env.NODE_ENV === 'development') {
          console.warn('VC Funds API Warning:', responseData.warning);
        }
      }
      
      if (responseData && Array.isArray(responseData.data)) {
        return responseData.data as VCFund[];
      } else if (Array.isArray(responseData)) {
        return responseData as VCFund[];
      } else {
        throw new Error('Unexpected API response format');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch VC funds');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getVCFund = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await vcFundsAPI.getVCFund(id);
      return response.data as VCFundDetail;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch VC fund');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getVCFundPortfolio = useCallback(async (id: string, params?: { sector?: string; stage?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await vcFundsAPI.getVCFundPortfolio(id, params);
      return response.data as VCFundPortfolioCompany[];
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch portfolio');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getVCFundPerformance = useCallback(async (
    id: string,
    params?: {
      start_date?: string;
      end_date?: string;
      limit?: number;
    },
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await vcFundsAPI.getVCFundPerformance(id, params);
      return response.data as VCFundPerformanceRecord[];
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch performance');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getVCFunds,
    getVCFund,
    getVCFundPortfolio,
    getVCFundPerformance,
    loading,
    error,
    warning,
  };
};

export const useVCInvestments = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getInvestments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await vcInvestmentsAPI.getInvestments();
      return response.data as InvestmentSummary;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch investments');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getInvestment = useCallback(async (currencyId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await vcInvestmentsAPI.getInvestment(currencyId);
      return response.data as InvestmentDetail;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch investment');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPortfolio = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const portfolio = await portfolioAPI.getPortfolio();
      
      // Portfolio API already transforms the data to match Portfolio interface
      // Just ensure values are properly formatted
      return {
        total_value: portfolio.total_value || 0,
        total_invested: portfolio.total_invested || 0,
        total_gains: portfolio.total_gains || 0,
        total_gains_percentage: portfolio.total_gains_percentage || 0,
        funds: portfolio.funds || [],
      } as Portfolio;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch portfolio');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getInvestments,
    getInvestment,
    getPortfolio,
    loading,
    error,
  };
};

