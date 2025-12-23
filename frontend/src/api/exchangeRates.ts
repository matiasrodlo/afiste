/**
 * Exchange Rate API Client
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v2';

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: string;
}

export interface CurrencyConversion {
  amount: number;
  from: string;
  to: string;
  rate: number;
  convertedAmount: number;
  fee?: number;
  timestamp: string;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

/**
 * Get exchange rate between two currencies
 */
export async function getExchangeRate(from: string, to: string): Promise<ExchangeRate> {
  const response = await fetch(`${API_BASE_URL}/public/exchange_rates/${from}/${to}`);
  if (!response.ok) {
    throw new Error('Failed to fetch exchange rate');
  }
  return response.json();
}

/**
 * Convert amount between currencies
 */
export async function convertCurrency(
  amount: number,
  from: string,
  to: string
): Promise<CurrencyConversion> {
  const params = new URLSearchParams({
    amount: amount.toString(),
    from,
    to,
  });
  
  const response = await fetch(`${API_BASE_URL}/public/exchange_rates/convert?${params}`);
  if (!response.ok) {
    throw new Error('Failed to convert currency');
  }
  return response.json();
}

/**
 * Get all supported currencies
 */
export async function getSupportedCurrencies(): Promise<Currency[]> {
  const response = await fetch(`${API_BASE_URL}/public/exchange_rates/currencies`);
  if (!response.ok) {
    throw new Error('Failed to fetch currencies');
  }
  return response.json();
}

/**
 * Get multiple exchange rates
 */
export async function getBulkRates(
  base: string,
  targets: string[]
): Promise<{ base: string; rates: Record<string, number>; timestamp: string }> {
  const params = new URLSearchParams({
    base,
    targets: targets.join(','),
  });
  
  const response = await fetch(`${API_BASE_URL}/public/exchange_rates/bulk?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch exchange rates');
  }
  return response.json();
}

/**
 * Get user's preferred currency
 */
export async function getUserPreferredCurrency(): Promise<{ currency: string }> {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`${API_BASE_URL}/account/currency/preference`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch preferred currency');
  }
  return response.json();
}

/**
 * Set user's preferred currency
 */
export async function setUserPreferredCurrency(currency: string): Promise<void> {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`${API_BASE_URL}/account/currency/preference`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currency }),
  });
  if (!response.ok) {
    throw new Error('Failed to set preferred currency');
  }
}

