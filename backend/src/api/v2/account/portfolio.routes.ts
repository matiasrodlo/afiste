import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../../middleware/auth.middleware';
import { InvestmentService } from '../../../services/InvestmentService';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get user portfolio summary
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const portfolio = await InvestmentService.calculateUserPortfolio(req.user.id);
    
    // Transform camelCase to snake_case for frontend consistency
    res.json({
      total_investments: portfolio.totalInvestments,
      total_current_value: portfolio.totalCurrentValue,
      total_invested: portfolio.totalInvested,
      total_gain_loss: portfolio.totalGainLoss,
      investments: portfolio.investments.map(inv => ({
        currency_id: inv.currencyId,
        fund_id: inv.fundId,
        fund_name: inv.fundName,
        balance: inv.balance,
        current_nav: inv.currentNav,
        current_value: inv.currentValue,
        locked: inv.locked,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch portfolio' });
  }
});

export default router;
