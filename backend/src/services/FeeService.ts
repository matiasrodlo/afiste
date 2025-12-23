import prisma from '../config/database';

export interface CreateFeeParams {
  vcFundId: string;
  feeType: string;
  rate: number;
  calculationMethod: string;
  period: string;
}

export interface CalculateFeeParams {
  feeId: string;
  periodStart: Date;
  periodEnd: Date;
}

export class FeeService {
  // Create fee for a fund
  static async createFee(params: CreateFeeParams) {
    const fund = await prisma.vCFund.findUnique({
      where: { id: params.vcFundId },
    });

    if (!fund) {
      throw new Error('VC Fund not found');
    }

    // Check for existing fee
    const existingFee = await prisma.fundFee.findFirst({
      where: {
        vcFundId: params.vcFundId,
        feeType: params.feeType,
        status: 'active',
      },
    });

    if (existingFee) {
      throw new Error(`Active ${params.feeType} fee already exists for this fund`);
    }

    const fee = await prisma.fundFee.create({
      data: {
        vcFundId: params.vcFundId,
        feeType: params.feeType,
        rate: params.rate,
        calculationMethod: params.calculationMethod,
        period: params.period,
        status: 'active',
      },
    });

    return fee;
  }

  // Calculate fee amount
  static async calculateFee(params: CalculateFeeParams) {
    const fee = await prisma.fundFee.findUnique({
      where: { id: params.feeId },
      include: { vcFund: true },
    });

    if (!fee) {
      throw new Error('Fee not found');
    }

    let amount = 0;

    switch (fee.calculationMethod) {
      case 'percentage_of_nav':
        const nav = Number(fee.vcFund.currentNav);
        const totalSupply = Number(fee.vcFund.totalSupply);
        const totalNAV = nav * totalSupply;
        amount = (totalNAV * Number(fee.rate)) / 100;
        break;

      case 'percentage_of_profit':
        // Simplified - assumes initial NAV was 1.0
        const currentNAV = Number(fee.vcFund.currentNav);
        const baseNAV = 1.0;
        const profit = currentNAV - baseNAV;
        if (profit > 0) {
          const totalSupply = Number(fee.vcFund.totalSupply);
          const totalProfit = profit * totalSupply;
          amount = (totalProfit * Number(fee.rate)) / 100;
        }
        break;

      case 'fixed':
        amount = Number(fee.rate);
        break;

      default:
        throw new Error(`Unknown calculation method: ${fee.calculationMethod}`);
    }

    return {
      fee,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      amount,
      currency: 'USDT',
    };
  }

  // Create fee charge record
  static async chargeFee(params: CalculateFeeParams) {
    const calculation = await this.calculateFee(params);

    const charge = await prisma.feeCharge.create({
      data: {
        feeId: params.feeId,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        amount: calculation.amount,
        currency: calculation.currency,
        status: 'pending',
      },
    });

    return charge;
  }

  // Get all fees for a fund
  static async getFundFees(vcFundId: string) {
    return await prisma.fundFee.findMany({
      where: {
        vcFundId,
        status: 'active',
      },
      include: {
        charges: {
          orderBy: { periodStart: 'desc' },
          take: 10,
        },
      },
    });
  }

  // Get fee charges with pagination
  static async getFeeCharges(params?: {
    feeId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (params?.feeId) where.feeId = params.feeId;
    if (params?.status) where.status = params.status;

    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const [charges, total] = await Promise.all([
      prisma.feeCharge.findMany({
        where,
        include: {
          fee: {
            include: {
              vcFund: true,
            },
          },
        },
        orderBy: { periodStart: 'desc' },
        skip,
        take: limit,
      }),
      prisma.feeCharge.count({ where }),
    ]);

    return {
      data: charges,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Update charge status
  static async updateChargeStatus(chargeId: string, status: string) {
    return await prisma.feeCharge.update({
      where: { id: chargeId },
      data: {
        status,
        chargedAt: status === 'charged' ? new Date() : undefined,
      },
    });
  }
}

