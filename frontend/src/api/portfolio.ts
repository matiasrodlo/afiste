// Portfolio API client
import apiClient from './auth';

export interface PortfolioInvestment {
  currency_id: string;
  fund_id: string;
  fund_name: string;
  balance: number;
  current_nav: number;
  current_value: number;
  locked: number;
}

export interface Portfolio {
  total_value: number;
  total_invested: number;
  total_gains: number;
  total_gains_percentage: number;
  funds: Array<{
    fund_id: string;
    fund_name: string;
    currency_id: string;
    tokens: number;
    nav: number;
    current_value: number;
    invested_value: number;
    gains: number;
    gains_percentage: number;
  }>;
}

export const portfolioAPI = {
  getPortfolio: async (): Promise<Portfolio> => {
    const response = await apiClient.get('/account/portfolio');
    const data = response.data;
    
    const totalInvested = data.total_invested || 0;
    const totalCurrentValue = data.total_current_value || 0;
    const totalGainLoss = data.total_gain_loss || 0;
    
    // Calculate invested value per fund proportionally
    // (This is an approximation - ideally we'd track per-fund investments)
    const investments = data.investments || [];
    const totalValue = investments.reduce((sum: number, inv: any) => {
      const val = typeof inv.current_value === 'number' ? inv.current_value : Number(inv.current_value) || 0;
      return sum + val;
    }, 0);
    
    // Transform backend response to match frontend Portfolio interface
    return {
      total_value: totalCurrentValue,
      total_invested: totalInvested,
      total_gains: totalGainLoss,
      total_gains_percentage: totalInvested > 0 
        ? (totalGainLoss / totalInvested) * 100 
        : 0,
      funds: investments.map((inv: any) => {
        const currentValue = typeof inv.current_value === 'number' 
          ? inv.current_value 
          : (inv.current_value ? Number(inv.current_value) : 0);
        const balance = typeof inv.balance === 'number' 
          ? inv.balance 
          : (inv.balance ? Number(inv.balance) : 0);
        const nav = typeof inv.current_nav === 'number' 
          ? inv.current_nav 
          : (inv.current_nav ? Number(inv.current_nav) : 0);
        
        // Calculate invested value proportionally based on current value
        const investedValue = totalValue > 0 && totalInvested > 0
          ? (currentValue / totalValue) * totalInvested
          : currentValue; // Fallback to current value if we can't calculate
        const gains = currentValue - investedValue;
        const gainsPercentage = investedValue > 0 ? (gains / investedValue) * 100 : 0;
        
        return {
          fund_id: inv.fund_id || inv.fundId || '',
          fund_name: inv.fund_name || inv.fundName || '',
          currency_id: inv.currency_id || inv.currencyId || '',
          tokens: balance,
          nav: nav,
          current_value: currentValue,
          invested_value: investedValue,
          gains: gains,
          gains_percentage: gainsPercentage,
        };
      }),
    };
  },
};

