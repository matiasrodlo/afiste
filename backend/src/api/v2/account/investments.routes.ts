import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../../middleware/auth.middleware';
import { InvestmentService } from '../../../services/InvestmentService';
import prisma from '../../../config/database';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get user investment summary
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const portfolio = await InvestmentService.calculateUserPortfolio(req.user.id);
    res.json(portfolio);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch investments' });
  }
});

// Create investment in a VC fund
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { vc_fund_id, amount } = req.body;

    if (!vc_fund_id || !amount) {
      return res.status(400).json({ error: 'vc_fund_id and amount are required' });
    }

    const result = await InvestmentService.processInvestment(
      req.user.id,
      vc_fund_id,
      amount
    );

    res.status(201).json({
      success: true,
      message: 'Investment processed successfully',
      investment: {
        fund_id: vc_fund_id,
        amount: Number(result.amountInvested),
        tokens_received: Number(result.tokensReceived),
        current_balance: Number(result.currentBalance),
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to process investment' });
  }
});

// Get user investment details for a specific currency
router.get('/:currency_id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { currency_id } = req.params;

    const currency = await prisma.currency.findUnique({
      where: { id: currency_id },
    });

    if (!currency) {
      return res.status(404).json({ error: 'Currency not found' });
    }

    if (!currency.vcFundId) {
      return res.status(400).json({ error: 'Currency is not a VC fund token' });
    }

    const fund = await prisma.vCFund.findUnique({
      where: { id: currency.vcFundId },
    });

    if (!fund) {
      return res.status(404).json({ error: 'Fund not found' });
    }

    const account = await prisma.account.findUnique({
      where: {
        userId_currencyId: {
          userId: req.user.id,
          currencyId: currency_id,
        },
      },
    });

    const balance = account ? Number(account.balance) : 0;
    const locked = account ? Number(account.locked) : 0;
    const available = balance - locked;

    res.json({
      currency_id: currency.id,
      fund: {
        id: fund.id,
        name: fund.name,
        manager: fund.manager,
        currentNav: Number(fund.currentNav),
      },
      balance,
      locked,
      available,
      totalValue: balance * Number(fund.currentNav),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch investment details' });
  }
});

export default router;

