import { Router, Request, Response } from 'express';
import prisma from '../../../config/database';

const router = Router();

// Get list of currencies
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, visible } = req.query;

    const where: any = {};
    if (type) {
      where.type = type;
    }
    if (visible !== undefined) {
      where.visible = visible === 'true';
    }

    const currencies = await prisma.currency.findMany({
      where,
      orderBy: { code: 'asc' },
    });

    res.json(
      currencies.map((currency) => ({
        id: currency.id,
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        precision: currency.precision,
        type: currency.type,
        visible: currency.visible,
        vcFundId: currency.vcFundId,
        vcFundName: currency.vcFundName,
        vcFundStatus: currency.vcFundStatus,
      }))
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch currencies' });
  }
});

// Get currency details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const currency = await prisma.currency.findUnique({
      where: { id },
      include: {
        vcFund: {
          include: {
            portfolioCompanies: true,
            performanceRecords: {
              orderBy: { recordDate: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!currency) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    const result: any = {
      id: currency.id,
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      precision: currency.precision,
      type: currency.type,
      visible: currency.visible,
      depositFee: currency.depositFee,
      withdrawFee: currency.withdrawFee,
      minDepositAmount: Number(currency.minDepositAmount),
      minWithdrawAmount: Number(currency.minWithdrawAmount),
    };

    // Add VC fund info if available
    if (currency.vcFund) {
      result.vcFund = {
        id: currency.vcFund.id,
        name: currency.vcFund.name,
        description: currency.vcFund.description,
        manager: currency.vcFund.manager,
        totalSupply: Number(currency.vcFund.totalSupply),
        availableSupply: Number(currency.vcFund.availableSupply),
        minimumInvestment: Number(currency.vcFund.minimumInvestment),
        status: currency.vcFund.status,
        riskLevel: currency.vcFund.riskLevel,
        regulatoryStatus: currency.vcFund.regulatoryStatus,
        currentNav: Number(currency.vcFund.currentNav),
        portfolioCompaniesCount: currency.vcFund.portfolioCompanies.length,
        latestPerformance: currency.vcFund.performanceRecords[0]
          ? {
              recordDate: currency.vcFund.performanceRecords[0].recordDate,
              navPerToken: Number(currency.vcFund.performanceRecords[0].navPerToken),
            }
          : null,
      };
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch currency' });
  }
});

export default router;

