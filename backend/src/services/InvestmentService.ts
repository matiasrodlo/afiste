import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { VCInvestmentValidator } from '../validators/VCInvestmentValidator';
import { KYCService } from './KYCService';

export class InvestmentError extends Error {}
export class InsufficientFundsError extends InvestmentError {}
export class InvalidInvestmentError extends InvestmentError {}

export interface ProcessInvestmentResult {
  success: boolean;
  tokensReceived: number;
  amountInvested: number;
  currentBalance: number;
}

export class InvestmentService {
  // Process an investment in a VC fund
  static async processInvestment(
    userId: string,
    fundId: string,
    amount: number | string
  ): Promise<ProcessInvestmentResult> {
    const amountDecimal = new Prisma.Decimal(amount);

    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new InvestmentError('User not found');
      }

      const fund = await tx.vCFund.findUnique({
        where: { id: fundId },
        include: { currency: true },
      });

      if (!fund) {
        throw new InvestmentError('Fund not found');
      }

      if (!fund.currency) {
        throw new InvestmentError('Fund currency missing');
      }

      if (!this.canInvest(user)) {
        throw new InvestmentError('User cannot invest');
      }

      if (!this.isFundAvailable(fund)) {
        throw new InvestmentError('Fund not available');
      }

      // Validate the investment amount and requirements
      const errors = VCInvestmentValidator.validate(user, fund, Number(amountDecimal));
      if (errors.length > 0) {
        throw new InvalidInvestmentError(errors.join(', '));
      }

      // Get USDT or USDC as quote currency
      const quoteCurrency = await tx.currency.findFirst({
        where: {
          OR: [{ id: 'usdt' }, { id: 'usdc' }],
        },
      });

      if (!quoteCurrency) {
        throw new InvestmentError('Quote currency not found (need USDT or USDC)');
      }

      const quoteAccount = await tx.account.upsert({
        where: {
          userId_currencyId: {
            userId: user.id,
            currencyId: quoteCurrency.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          currencyId: quoteCurrency.id,
          balance: new Prisma.Decimal(0),
          locked: new Prisma.Decimal(0),
        },
      });

      const vcAccount = await tx.account.upsert({
        where: {
          userId_currencyId: {
            userId: user.id,
            currencyId: fund.currency.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          currencyId: fund.currency.id,
          balance: new Prisma.Decimal(0),
          locked: new Prisma.Decimal(0),
        },
      });

      const availableBalance = new Prisma.Decimal(quoteAccount.balance).minus(
        quoteAccount.locked
      );
      if (availableBalance.lt(amountDecimal)) {
        throw new InsufficientFundsError('Insufficient funds');
      }

      const tokensToReceive = amountDecimal.div(fund.currentNav);
      // Check if we have enough tokens
      if (new Prisma.Decimal(fund.availableSupply).lt(tokensToReceive)) {
        throw new InvestmentError('Not enough tokens available');
      }

      await tx.account.update({
        where: { id: quoteAccount.id },
        data: {
          locked: new Prisma.Decimal(quoteAccount.locked).plus(amountDecimal),
        },
      });

      await tx.account.update({
        where: { id: vcAccount.id },
        data: {
          balance: new Prisma.Decimal(vcAccount.balance).plus(tokensToReceive),
        },
      });

      await tx.vCFund.update({
        where: { id: fundId },
        data: {
          availableSupply: new Prisma.Decimal(fund.availableSupply).minus(tokensToReceive),
        },
      });

      await tx.account.update({
        where: { id: quoteAccount.id },
        data: {
          balance: new Prisma.Decimal(quoteAccount.balance).minus(amountDecimal),
          locked: new Prisma.Decimal(quoteAccount.locked).minus(amountDecimal),
        },
      });

      const updatedVcAccount = await tx.account.findUnique({
        where: { id: vcAccount.id },
      });
      
      const investmentAmount = Number(amountDecimal);
      const quoteCurrencyCode = quoteCurrency.id;

      // Record AML transaction after commit (async, don't block)
      process.nextTick(async () => {
        await KYCService.recordAMLTransaction({
          userId,
          transactionType: 'investment',
          amount: investmentAmount,
          currency: quoteCurrencyCode,
        }).catch(err => {
          if (process.env.NODE_ENV === 'development') {
            console.error('Failed to record AML transaction:', err);
          }
        });
      });

      return {
        success: true,
        tokensReceived: Number(tokensToReceive),
        amountInvested: investmentAmount,
        currentBalance: updatedVcAccount ? Number(updatedVcAccount.balance) : 0,
      };
    });
  }

  static async calculateUserPortfolio(userId: string): Promise<{
    totalInvestments: number;
    totalCurrentValue: number;
    totalInvested: number;
    totalGainLoss: number;
    investments: Array<{
      currencyId: string;
      fundId: string;
      fundName: string;
      balance: number;
      currentNav: number;
      currentValue: number;
      locked: number;
    }>;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: {
          include: {
            currency: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const vcAccounts = user.accounts.filter(
      (account) =>
        account.currency.vcFundId &&
        (Number(account.balance) > 0 || Number(account.locked) > 0)
    );

    let totalCurrentValue = 0;
    const investments: Array<{
      currencyId: string;
      fundId: string;
      fundName: string;
      balance: number;
      currentNav: number;
      currentValue: number;
      locked: number;
    }> = [];

    const fundIds = vcAccounts
      .map(acc => acc.currency.vcFundId)
      .filter((id): id is string => id !== null);

    const funds = await prisma.vCFund.findMany({
      where: { id: { in: fundIds } },
      include: {
        performanceRecords: {
          orderBy: { recordDate: 'desc' },
          take: 1,
        },
      },
    });

    const fundMap = new Map(funds.map(fund => [fund.id, fund]));

    const investmentTransactions = await prisma.aMLTransaction.findMany({
      where: {
        userId: userId,
        transactionType: 'investment',
      },
    });

    let totalInvested = 0;
    for (const transaction of investmentTransactions) {
      const amount = Number(transaction.amount);
      if (!isNaN(amount) && isFinite(amount)) {
        totalInvested += amount;
      }
    }

    for (const account of vcAccounts) {
      if (!account.currency.vcFundId) continue;

      const fund = fundMap.get(account.currency.vcFundId);
      if (!fund) continue;

      const balance = Number(account.balance);
      
      // Use latest performance record NAV if available, otherwise fall back to currentNav
      let currentNav = Number(fund.currentNav) || 0;
      if (fund.performanceRecords && fund.performanceRecords.length > 0) {
        const latestNav = Number(fund.performanceRecords[0].navPerToken);
        if (latestNav > 0) {
          currentNav = latestNav;
        }
      }
      
      // Ensure NAV is valid (greater than 0)
      if (currentNav <= 0) {
        if (process.env.NODE_ENV === 'development') {
          // NAV is invalid, use 1.0 as fallback
          console.warn(`Fund ${fund.id} (${fund.name}) has invalid NAV: ${currentNav}. Using default NAV of 1.0`);
        }
        currentNav = 1.0; // Default NAV if invalid
      }
      
      const currentValue = balance * currentNav;
      totalCurrentValue += currentValue;

      investments.push({
        currencyId: account.currency.id,
        fundId: fund.id,
        fundName: fund.name,
        balance,
        currentNav,
        currentValue,
        locked: Number(account.locked),
      });
    }

    // Calculate actual gain/loss
    const totalGainLoss = totalCurrentValue - totalInvested;
    const totalGainLossPercentage = totalInvested > 0 
      ? (totalGainLoss / totalInvested) * 100 
      : 0;

    return {
      totalInvestments: investments.length,
      totalCurrentValue,
      totalInvested,
      totalGainLoss,
      investments,
    };
  }

  private static canInvest(user: any): boolean {
    return (
      user.isActive &&
      user.kycLevel >= 1 &&
      user.kycStatus === 'verified'
    );
  }

  private static isFundAvailable(fund: any): boolean {
    return fund.status === 'active' && fund.regulatoryStatus === 'approved';
  }
}

