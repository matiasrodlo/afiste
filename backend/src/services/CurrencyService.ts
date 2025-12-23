// Currency conversion and formatting
import { PrismaClient } from '@prisma/client';
import { ExchangeRateService } from './ExchangeRateService';
import { Decimal } from 'decimal.js';

const prisma = new PrismaClient();

export interface CurrencyConversion {
  amount: number;
  from: string;
  to: string;
  rate: number;
  convertedAmount: number;
  fee?: number;
  timestamp: Date;
}

export interface CurrencyFormat {
  code: string;
  symbol: string;
  precision: number;
  format: (amount: number) => string;
}

export class CurrencyService {
  // Convert between currencies
  static async convert(
    amount: number,
    from: string,
    to: string,
    includeFee: boolean = false
  ): Promise<CurrencyConversion> {
    const rate = await ExchangeRateService.getRate(from, to);
    const convertedAmount = new Decimal(amount)
      .times(rate)
      .toNumber();

    // Fee calculation (0.1%)
    let fee = 0;
    if (includeFee) {
      fee = this.calculateConversionFee(convertedAmount);
    }

    return {
      amount,
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate,
      convertedAmount: includeFee ? convertedAmount - fee : convertedAmount,
      fee: includeFee ? fee : undefined,
      timestamp: new Date(),
    };
  }

  private static calculateConversionFee(amount: number): number {
    // 0.1% fee
    return new Decimal(amount)
      .times(0.001)
      .toNumber();
  }

  // Format currency for display
  static async formatCurrency(amount: number, currencyCode: string): Promise<string> {
    const currency = await prisma.currency.findUnique({
      where: { code: currencyCode.toUpperCase() },
    });

    if (!currency) {
      return `${amount.toFixed(2)} ${currencyCode.toUpperCase()}`;
    }

    const formatted = new Decimal(amount)
      .toFixed(currency.precision)
      .replace(/\.?0+$/, '');

    return `${currency.symbol}${formatted}`;
  }

  // Get user's preferred currency (defaults to USD)
  static async getUserPreferredCurrency(userId: string): Promise<string> {
    // TODO: store preference in user model
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { country: true },
    });

    // Basic country -> currency mapping
    const countryCurrencyMap: Record<string, string> = {
      US: 'USD',
      GB: 'GBP',
      EU: 'EUR',
      JP: 'JPY',
      CN: 'CNY',
    };

    if (user?.country && countryCurrencyMap[user.country]) {
      return countryCurrencyMap[user.country];
    }

    return 'USD';
  }

  // TODO: implement storing user preference
  static async setUserPreferredCurrency(userId: string, currencyCode: string): Promise<void> {
    const currency = await prisma.currency.findUnique({
      where: { code: currencyCode.toUpperCase() },
    });

    if (!currency) {
      throw new Error(`Currency ${currencyCode} not found`);
    }

    // Not implemented yet
  }

  // Get list of supported currencies
  static async getSupportedCurrencies(): Promise<Array<{ code: string; name: string; symbol: string }>> {
    const currencies = await prisma.currency.findMany({
      where: { visible: true },
      select: {
        code: true,
        name: true,
        symbol: true,
      },
      orderBy: { code: 'asc' },
    });

    return currencies;
  }

  static async getCurrencyDetails(currencyCode: string) {
    const currency = await prisma.currency.findUnique({
      where: { code: currencyCode.toUpperCase() },
    });

    if (!currency) {
      throw new Error(`Currency ${currencyCode} not found`);
    }

    return currency;
  }

  // Convert entire portfolio to target currency
  static async convertPortfolio(
    portfolio: Array<{ currency: string; amount: number }>,
    targetCurrency: string
  ): Promise<number> {
    let total = new Decimal(0);

    for (const item of portfolio) {
      if (item.currency.toUpperCase() === targetCurrency.toUpperCase()) {
        total = total.plus(item.amount);
      } else {
        const converted = await ExchangeRateService.convert(
          item.amount,
          item.currency,
          targetCurrency
        );
        total = total.plus(converted);
      }
    }

    return total.toNumber();
  }
}

