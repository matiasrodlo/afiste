/**
 * Currency Utility Functions
 */

import { convertCurrency } from '../api/exchangeRates';

/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  options?: {
    showSymbol?: boolean;
    precision?: number;
  }
): string {
  const { showSymbol = true, precision = 2 } = options || {};

  const currencySymbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
    BTC: '₿',
    ETH: 'Ξ',
  };

  const symbol = showSymbol ? (currencySymbols[currencyCode] || currencyCode) : '';
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });

  return currencyCode === 'USD' || currencyCode === 'EUR' || currencyCode === 'GBP'
    ? `${symbol}${formatted}`
    : `${formatted} ${symbol}`;
}

/**
 * Format currency with conversion
 */
export async function formatCurrencyWithConversion(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  options?: {
    showSymbol?: boolean;
    precision?: number;
  }
): Promise<string> {
  if (fromCurrency === toCurrency) {
    return formatCurrency(amount, toCurrency, options);
  }

  try {
    const conversion = await convertCurrency(amount, fromCurrency, toCurrency);
    return formatCurrency(conversion.convertedAmount, toCurrency, options);
  } catch (error) {
    console.error('Currency conversion failed:', error);
    return formatCurrency(amount, fromCurrency, options);
  }
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currencyCode: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CNY: '¥',
    BTC: '₿',
    ETH: 'Ξ',
    USDT: '$',
  };

  return symbols[currencyCode.toUpperCase()] || currencyCode.toUpperCase();
}

/**
 * Parse currency amount from string
 */
export function parseCurrencyAmount(value: string): number {
  // Remove currency symbols and commas
  const cleaned = value
    .replace(/[$,€£¥₿Ξ]/g, '')
    .replace(/,/g, '')
    .trim();

  return parseFloat(cleaned) || 0;
}

