// Exchange rate service - fetches rates from APIs and caches them
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

// Simple in-memory cache for rates
const rateCache = new Map<string, { rate: number; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // cache for 1 minute

const EXCHANGE_RATE_API = process.env.EXCHANGE_RATE_API || 'https://api.exchangerate-api.com/v4/latest';
const FALLBACK_API = 'https://api.fixer.io/latest';

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
}

export class ExchangeRateService {
  // Get exchange rate between two currencies
  static async getRate(from: string, to: string): Promise<number> {
    const fromCode = from.toUpperCase();
    const toCode = to.toUpperCase();

    if (fromCode === toCode) {
      return 1;
    }

    // Check cache first
    const cacheKey = `${fromCode}_${toCode}`;
    const cached = rateCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.rate;
    }

    try {
      const rate = await this.fetchRate(fromCode, toCode);
      rateCache.set(cacheKey, {
        rate,
        timestamp: Date.now(),
      });
      return rate;
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
      
      // Try database cache as fallback
      const dbRate = await this.getRateFromDB(fromCode, toCode);
      if (dbRate) {
        return dbRate;
      }

      // Last resort: return 1
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Using fallback rate of 1 for ${fromCode}/${toCode}`);
      }
      return 1;
    }
  }

  private static async fetchRate(from: string, to: string): Promise<number> {
    try {
      // Try primary API (exchangerate-api.com)
      const response = await axios.get(`${EXCHANGE_RATE_API}/${from}`);
      const rates = response.data.rates;
      
      if (rates && rates[to]) {
        const rate = rates[to];
        
        // Store in database cache
        await this.storeRateInDB(from, to, rate);
        
        return rate;
      }
      
      throw new Error(`Rate not found for ${from}/${to}`);
    } catch (error) {
      // Try fallback API if primary fails
      try {
        const response = await axios.get(`${FALLBACK_API}?base=${from}&symbols=${to}`, {
          timeout: 5000,
        });
        
        if (response.data.rates && response.data.rates[to]) {
          const rate = response.data.rates[to];
          await this.storeRateInDB(from, to, rate);
          return rate;
        }
      } catch (fallbackError) {
        console.error('Fallback API also failed:', fallbackError);
      }
      
      throw error;
    }
  }

  // TODO: implement database cache for rates
  private static async getRateFromDB(from: string, to: string): Promise<number | null> {
    // Would need ExchangeRate table - not implemented yet
    return null;
  }

  // Not implemented yet
  private static async storeRateInDB(from: string, to: string, rate: number): Promise<void> {
    // In a real implementation, we'd store in ExchangeRate table
    // For now, we'll just use in-memory cache
  }

  // Convert amount from one currency to another
  static async convert(amount: number, from: string, to: string): Promise<number> {
    const rate = await this.getRate(from, to);
    return amount * rate;
  }

  // Get rates for multiple currencies at once
  static async getRates(baseCurrency: string, targetCurrencies: string[]): Promise<Record<string, number>> {
    const rates: Record<string, number> = {};
    
    for (const target of targetCurrencies) {
      rates[target] = await this.getRate(baseCurrency, target);
    }
    
    return rates;
  }

  // Clear the cache
  static clearCache(): void {
    rateCache.clear();
  }

  // Get list of available currencies from API
  static async getAvailableCurrencies(): Promise<string[]> {
    try {
      const response = await axios.get(`${EXCHANGE_RATE_API}/USD`);
      return Object.keys(response.data.rates || {});
    } catch (error) {
      // Fallback to common currencies
      return ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'BTC', 'ETH', 'USDT'];
    }
  }
}

