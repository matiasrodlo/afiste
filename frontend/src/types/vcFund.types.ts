// VC Fund Types for Afiste Platform

export interface VCFund {
  id: string;
  name: string;
  description?: string;
  manager: string;
  total_supply: number;
  available_supply: number;
  fund_size?: number;
  minimum_investment: number;
  launch_date?: string;
  maturity_date?: string;
  status: 'active' | 'closed' | 'liquidated';
  risk_level: 'low' | 'medium' | 'high';
  regulatory_status: 'approved' | 'pending' | 'rejected';
  current_nav: number;
  tokens_available_percentage: number;
  created_at?: string;
  updated_at?: string;
}

export interface VCFundDetail extends VCFund {
  terms?: string;
  documents?: Record<string, string>;
  latest_nav: number;
  total_portfolio_value: number;
  portfolio_companies_count: number;
}

export interface VCFundPortfolioCompany {
  id: number;
  vc_fund_id: string;
  name: string;
  sector?: string;
  stage?: string;
  investment_amount?: number;
  investment_date?: string;
  current_valuation?: number;
  ownership_percentage?: number;
  description?: string;
  roi?: number;
  created_at?: string;
  updated_at?: string;
}

export interface VCFundPerformanceRecord {
  id: number;
  vc_fund_id: string;
  record_date: string;
  nav_per_token: number;
  total_assets?: number;
  total_liabilities?: number;
  net_assets?: number;
  performance_metrics?: Record<string, any>;
  performance_change?: number;
  created_at?: string;
  updated_at?: string;
}

export interface InvestmentFund {
  fund_id: string;
  fund_name: string;
  currency_id: string;
  tokens: number;
  nav: number;
  current_value: number;
  invested_value: number;
  gains: number;
  gains_percentage: number;
}

export interface InvestmentSummary {
  total_value: number;
  total_invested: number;
  total_gains: number;
  total_gains_percentage: number;
  funds: InvestmentFund[];
}

export interface InvestmentDetail {
  currency_id: string;
  fund: VCFundDetail;
  tokens: number;
  nav: number;
  current_value: number;
  portfolio_companies: VCFundPortfolioCompany[];
  performance_records: VCFundPerformanceRecord[];
}

export interface Portfolio extends InvestmentSummary {}

export interface VCFundFilters {
  status?: 'active' | 'closed' | 'liquidated';
  risk_level?: 'low' | 'medium' | 'high';
  search?: string;
  page?: number;
  limit?: number;
}

