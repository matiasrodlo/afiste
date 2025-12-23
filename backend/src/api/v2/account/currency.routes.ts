/**
 * Currency Preferences API Routes
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../../middleware/auth.middleware';
import { CurrencyService } from '../../../services/CurrencyService';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v2/account/currency/preference
 * Get user's preferred currency
 */
router.get('/preference', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const currency = await CurrencyService.getUserPreferredCurrency(userId);
    res.json({ currency });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/v2/account/currency/preference
 * Set user's preferred currency
 */
router.put('/preference', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { currency } = req.body;

    if (!currency) {
      return res.status(400).json({ error: 'currency is required' });
    }

    await CurrencyService.setUserPreferredCurrency(userId, currency);
    res.json({ message: 'Preferred currency updated', currency });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v2/account/currency/convert-portfolio
 * Convert portfolio value to preferred currency
 */
router.post('/convert-portfolio', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { portfolio, targetCurrency } = req.body;

    if (!portfolio || !Array.isArray(portfolio)) {
      return res.status(400).json({ error: 'portfolio array is required' });
    }

    const currency = targetCurrency || await CurrencyService.getUserPreferredCurrency(userId);
    const total = await CurrencyService.convertPortfolio(portfolio, currency);

    const portfolioWithConversions = await Promise.all(
      portfolio.map(async (item: any) => ({
        ...item,
        converted: item.currency.toUpperCase() === currency.toUpperCase()
          ? item.amount
          : await CurrencyService.convert(item.amount, item.currency, currency),
      }))
    );

    res.json({
      total,
      currency,
      portfolio: portfolioWithConversions,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

