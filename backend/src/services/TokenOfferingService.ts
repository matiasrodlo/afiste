import prisma from '../config/database';
import { VCFundService } from './VCFundService';

export interface CreateOfferingParams {
  vcFundId: string;
  offeringType?: string;
  startDate: Date;
  endDate?: Date;
  offeringPrice: number;
  minInvestment: number;
  maxInvestment?: number;
  totalTokensOffered: number;
  whitelistRequired?: boolean;
  description?: string;
}

export interface PurchaseTokensParams {
  offeringId: string;
  userId: string;
  amount: number; // Amount in quote currency (USDT/USDC)
}

export class TokenOfferingService {
  // Create new token offering
  static async createOffering(params: CreateOfferingParams) {
    const fund = await prisma.vCFund.findUnique({
      where: { id: params.vcFundId },
    });

    if (!fund) {
      throw new Error('VC Fund not found');
    }

    if (fund.status !== 'active') {
      throw new Error('Fund must be active to create an offering');
    }

    if (fund.regulatoryStatus !== 'approved') {
      throw new Error('Fund must be approved to create an offering');
    }

    // Check for existing offering
    const existingOffering = await prisma.tokenOffering.findUnique({
      where: { vcFundId: params.vcFundId },
    });

    if (existingOffering) {
      throw new Error('An offering already exists for this fund');
    }

    // Make sure we have enough tokens
    if (params.totalTokensOffered > Number(fund.availableSupply)) {
      throw new Error('Not enough tokens available');
    }

    const offering = await prisma.tokenOffering.create({
      data: {
        vcFundId: params.vcFundId,
        offeringType: params.offeringType || 'initial',
        startDate: params.startDate,
        endDate: params.endDate,
        offeringPrice: params.offeringPrice,
        minInvestment: params.minInvestment,
        maxInvestment: params.maxInvestment,
        totalTokensOffered: params.totalTokensOffered,
        whitelistRequired: params.whitelistRequired || false,
        description: params.description,
        status: params.startDate <= new Date() ? 'active' : 'upcoming',
      },
    });

    return offering;
  }

  /**
   * Purchase tokens during an offering
   */
  static async purchaseTokens(params: PurchaseTokensParams) {
    return await prisma.$transaction(async (tx) => {
      // Get offering
      const offering = await tx.tokenOffering.findUnique({
        where: { id: params.offeringId },
        include: { vcFund: true },
      });

      if (!offering) {
        throw new Error('Offering not found');
      }

      // Validate offering status
      if (offering.status !== 'active') {
        throw new Error(`Offering is not active. Current status: ${offering.status}`);
      }

      // Validate dates
      const now = new Date();
      if (offering.startDate > now) {
        throw new Error('Offering has not started yet');
      }

      if (offering.endDate && offering.endDate < now) {
        throw new Error('Offering has ended');
      }

      // Validate investment amount
      if (params.amount < Number(offering.minInvestment)) {
        throw new Error(`Minimum investment is ${offering.minInvestment}`);
      }

      if (offering.maxInvestment && params.amount > Number(offering.maxInvestment)) {
        throw new Error(`Maximum investment is ${offering.maxInvestment}`);
      }

      // Calculate tokens to purchase
      const tokensToPurchase = params.amount / Number(offering.offeringPrice);

      // Validate tokens available
      const tokensRemaining = Number(offering.totalTokensOffered) - Number(offering.tokensSold);
      if (tokensToPurchase > tokensRemaining) {
        throw new Error(`Insufficient tokens available. Remaining: ${tokensRemaining}`);
      }

      // Get user
      const user = await tx.user.findUnique({
        where: { id: params.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Validate KYC
      if (user.kycStatus !== 'verified' || user.kycLevel < 1) {
        throw new Error('KYC verification required to purchase tokens');
      }

      // Find quote currency (USDT or USDC)
      const quoteCurrency = await tx.currency.findFirst({
        where: {
          OR: [{ id: 'usdt' }, { id: 'usdc' }],
        },
      });

      if (!quoteCurrency) {
        throw new Error('Quote currency (USDT/USDC) not found');
      }

      let quoteAccount = await tx.account.findUnique({
        where: {
          userId_currencyId: {
            userId: params.userId,
            currencyId: quoteCurrency.id,
          },
        },
      });

      if (!quoteAccount) {
        // Create account if it doesn't exist
        quoteAccount = await tx.account.create({
          data: {
            userId: params.userId,
            currencyId: quoteCurrency.id,
            balance: 0,
            locked: 0,
          },
        });
      }

      // Validate balance
      if (Number(quoteAccount.balance) < params.amount) {
        throw new Error('Insufficient balance');
      }

      // Get VC token currency
      const vcCurrency = await tx.currency.findFirst({
        where: { vcFundId: offering.vcFundId },
      });

      if (!vcCurrency) {
        throw new Error('VC token currency not found');
      }

      // Record AML transaction (outside transaction to avoid circular dependency)
      setImmediate(async () => {
        try {
          const { KYCService } = await import('./KYCService');
          await KYCService.recordAMLTransaction({
            userId: params.userId,
            transactionType: 'investment',
            amount: params.amount,
            currency: quoteCurrency.id,
          });
        } catch (error) {
          console.error('Failed to record AML transaction:', error);
        }
      });

      // Get or create VC token account
      let vcAccount = await tx.account.findUnique({
        where: {
          userId_currencyId: {
            userId: params.userId,
            currencyId: vcCurrency.id,
          },
        },
      });

      if (!vcAccount) {
        vcAccount = await tx.account.create({
          data: {
            userId: params.userId,
            currencyId: vcCurrency.id,
            balance: 0,
            locked: 0,
          },
        });
      }

      // Update balances
      await tx.account.update({
        where: { id: quoteAccount.id },
        data: {
          balance: Number(quoteAccount.balance) - params.amount,
        },
      });

      await tx.account.update({
        where: { id: vcAccount.id },
        data: {
          balance: Number(vcAccount.balance) + tokensToPurchase,
        },
      });

      // Update offering
      const newTokensSold = Number(offering.tokensSold) + tokensToPurchase;
      const newStatus = newTokensSold >= Number(offering.totalTokensOffered) ? 'completed' : offering.status;

      await tx.tokenOffering.update({
        where: { id: params.offeringId },
        data: {
          tokensSold: newTokensSold,
          status: newStatus,
        },
      });

      // Update fund available supply
      await tx.vCFund.update({
        where: { id: offering.vcFundId },
        data: {
          availableSupply: Number(offering.vcFund.availableSupply) - tokensToPurchase,
        },
      });

      // Create or update allocation
      await tx.tokenAllocation.upsert({
        where: {
          offeringId_userId: {
            offeringId: params.offeringId,
            userId: params.userId,
          },
        },
        create: {
          offeringId: params.offeringId,
          userId: params.userId,
          allocatedTokens: 0,
          purchasedTokens: tokensToPurchase,
        },
        update: {
          purchasedTokens: {
            increment: tokensToPurchase,
          },
        },
      });

      return {
        tokensPurchased: tokensToPurchase,
        amountPaid: params.amount,
        newBalance: Number(vcAccount.balance) + tokensToPurchase,
      };
    });
  }

  /**
   * Get offering details
   */
  static async getOffering(offeringId: string) {
    return await prisma.tokenOffering.findUnique({
      where: { id: offeringId },
      include: {
        vcFund: {
          include: {
            currency: true,
          },
        },
        allocations: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * List offerings
   */
  static async listOfferings(params?: {
    status?: string;
    vcFundId?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (params?.status) where.status = params.status;
    if (params?.vcFundId) where.vcFundId = params.vcFundId;

    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const [offerings, total] = await Promise.all([
      prisma.tokenOffering.findMany({
        where,
        include: {
          vcFund: {
            include: {
              currency: true,
            },
          },
        },
        orderBy: { startDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.tokenOffering.count({ where }),
    ]);

    return {
      data: offerings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update offering status
   */
  static async updateOfferingStatus(offeringId: string, status: string) {
    return await prisma.tokenOffering.update({
      where: { id: offeringId },
      data: { status },
    });
  }
}

