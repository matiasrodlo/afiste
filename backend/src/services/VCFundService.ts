import prisma from '../config/database';
import { VCFund, Currency, Prisma } from '@prisma/client';

export interface CreateFundParams {
  id?: string;
  name: string;
  manager: string;
  totalSupply: number | string;
  minimumInvestment: number | string;
  description?: string;
  availableSupply?: number | string;
  fundSize?: number | string;
  launchDate?: Date | string;
  maturityDate?: Date | string;
  status?: string;
  riskLevel?: string;
  regulatoryStatus?: string;
  terms?: string;
  documents?: Record<string, any>;
  currentNav?: number | string;
  currencyId?: string;
  quoteCurrency?: string;
  initialOfferingPrice?: number | string;
}

export interface UpdateNAVParams {
  recordDate?: Date | string;
  totalAssets?: number | string;
  totalLiabilities?: number | string;
  performanceMetrics?: Record<string, any>;
}

export class VCFundService {
  // Creates a new VC fund and sets up the associated token
  static async createFund(params: CreateFundParams): Promise<VCFund> {
    return await prisma.$transaction(async (tx) => {
      this.validateFundParams(params);

      let fundId = params.id || this.generateFundId(params.name);
      const existingFund = await tx.vCFund.findUnique({ where: { id: fundId } });
      if (existingFund) {
        // HACK: append timestamp if duplicate (should handle this better)
        fundId = `${fundId}-${Date.now()}`;
      }

      // Create the fund
      const fund = await tx.vCFund.create({
        data: {
          id: fundId,
          name: params.name,
          description: params.description || null,
          manager: params.manager,
          totalSupply: new Prisma.Decimal(params.totalSupply),
          availableSupply: new Prisma.Decimal(params.availableSupply || params.totalSupply),
          fundSize: params.fundSize ? new Prisma.Decimal(params.fundSize) : null,
          minimumInvestment: new Prisma.Decimal(params.minimumInvestment),
          launchDate: params.launchDate ? new Date(params.launchDate) : null,
          maturityDate: params.maturityDate ? new Date(params.maturityDate) : null,
          status: params.status || 'active',
          riskLevel: params.riskLevel || 'medium',
          regulatoryStatus: params.regulatoryStatus || 'pending',
          terms: params.terms || null,
          documents: params.documents || {},
          currentNav: new Prisma.Decimal(params.currentNav || 1.0),
        },
      });

      // Create the token/currency for this fund
      const currencyId = params.currencyId || `vc-${fund.id}`;
      
      const existingCurrency = await tx.currency.findUnique({
        where: { code: currencyId }
      });
      
      if (existingCurrency) {
        throw new Error(`Currency "${currencyId}" already exists`);
      }
      
      await tx.currency.create({
        data: {
          id: currencyId,
          code: currencyId,
          name: fund.name,
          symbol: currencyId.toUpperCase(),
          precision: 8,
          type: 'coin',
          visible: true,
          depositFee: 0,
          withdrawFee: 0,
          minDepositAmount: new Prisma.Decimal(0),
          minWithdrawAmount: new Prisma.Decimal(0),
          options: {},
          // VC Fund fields
          vcFundId: fund.id,
          vcFundName: fund.name,
          vcFundDescription: fund.description,
          vcFundManager: fund.manager,
          vcFundSize: fund.fundSize,
          vcFundLaunchDate: fund.launchDate,
          vcFundMaturityDate: fund.maturityDate,
          vcFundMinimumInvestment: fund.minimumInvestment,
          vcFundTotalSupply: fund.totalSupply,
          vcFundAvailableSupply: fund.availableSupply,
          vcFundRiskLevel: fund.riskLevel,
          vcFundStatus: fund.status,
          vcFundRegulatoryStatus: fund.regulatoryStatus,
          vcFundTerms: fund.terms,
          vcFundDocuments: fund.documents as any,
        },
      });

      // TODO: create market for this fund automatically


      return fund;
    });
  }

  /**
   * Update NAV for VC fund
   */
  static async updateNAV(fundId: string, navData: UpdateNAVParams): Promise<number> {
    return await prisma.$transaction(async (tx) => {
      const fund = await tx.vCFund.findUnique({
        where: { id: fundId },
        include: {
          portfolioCompanies: true,
        },
      });

      if (!fund) {
        throw new Error(`Fund not found: ${fundId}`);
      }

      const newNav = this.calculateNavFromPortfolio(fund);

      await tx.vCFund.update({
        where: { id: fundId },
        data: { currentNav: new Prisma.Decimal(newNav) },
      });

      await tx.vCFundPerformanceRecord.create({
        data: {
          vcFundId: fund.id,
          recordDate: navData.recordDate ? new Date(navData.recordDate) : new Date(),
          navPerToken: new Prisma.Decimal(newNav),
          totalAssets: navData.totalAssets ? new Prisma.Decimal(navData.totalAssets) : null,
          totalLiabilities: navData.totalLiabilities
            ? new Prisma.Decimal(navData.totalLiabilities)
            : null,
          performanceMetrics: navData.performanceMetrics || {},
        },
      });

      const currency = await tx.currency.findFirst({
        where: { vcFundId: fund.id },
      });

      if (currency) {
        await tx.currency.update({
          where: { id: currency.id },
          data: {
            vcFundPerformanceData: {
              ...((currency.vcFundPerformanceData as any) || {}),
              latest_nav: newNav,
              updated_at: new Date().toISOString(),
            },
          },
        });
      }

      return newNav;
    });
  }

  /**
   * Mint tokens for VC fund
   */
  static async mintTokens(
    fundId: string,
    amount: number | string,
    toAccountId: string
  ): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      const fund = await tx.vCFund.findUnique({
        where: { id: fundId },
        include: { currency: true },
      });

      if (!fund) {
        throw new Error(`Fund not found: ${fundId}`);
      }

      if (!fund.currency) {
        throw new Error(`Currency not found for fund: ${fundId}`);
      }

      const amountDecimal = new Prisma.Decimal(amount);

      const newAvailableSupply = new Prisma.Decimal(fund.availableSupply).plus(amountDecimal);
      if (newAvailableSupply.gt(fund.totalSupply)) {
        throw new Error('Cannot mint tokens: would exceed total supply');
      }

      const account = await tx.account.upsert({
        where: {
          userId_currencyId: {
            userId: toAccountId,
            currencyId: fund.currency.id,
          },
        },
        update: {
          balance: {
            increment: amountDecimal,
          },
        },
        create: {
          userId: toAccountId,
          currencyId: fund.currency.id,
          balance: amountDecimal,
          locked: new Prisma.Decimal(0),
        },
      });

      await tx.vCFund.update({
        where: { id: fundId },
        data: {
          availableSupply: newAvailableSupply,
        },
      });

      return account;
    });
  }

  private static validateFundParams(params: CreateFundParams): void {
    const required = ['name', 'manager', 'totalSupply', 'minimumInvestment'];
    const missing = required.filter((key) => !params[key as keyof CreateFundParams]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required params: ${missing.join(', ')}`);
    }
  }

  private static generateFundId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private static calculateNavFromPortfolio(fund: any): number {
    const totalValue = fund.portfolioCompanies.reduce((sum: number, company: any) => {
      return sum + (company.currentValuation ? Number(company.currentValuation) : 0);
    }, 0);

    if (totalValue === 0 || Number(fund.totalSupply) === 0) return Number(fund.currentNav);
    return Number((totalValue / Number(fund.totalSupply)).toFixed(8));
  }
}

