/**
 * Exchange Rate API Routes
 */

import { Router, Request, Response } from 'express';
import { ExchangeRateService } from '../../../services/ExchangeRateService';
import { CurrencyService } from '../../../services/CurrencyService';

const router = Router();

/**
 * GET /api/v2/public/exchange_rates/:from/:to
 * Get exchange rate between two currencies
 */
router.get('/:from/:to', async (req: Request, res: Response) => {
  try {
    const { from, to } = req.params;

    const rate = await ExchangeRateService.getRate(from, to);
    res.json({
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate,
      timestamp: new Date(),
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v2/public/exchange_rates/convert
 * Convert amount between currencies
 * Query params: amount, from, to
 */
router.get('/convert', async (req: Request, res: Response) => {
  try {
    const amount = parseFloat(req.query.amount as string);
    const from = req.query.from as string;
    const to = req.query.to as string;

    if (!amount || !from || !to) {
      return res.status(400).json({ error: 'amount, from, and to are required' });
    }

    const conversion = await CurrencyService.convert(amount, from, to, false);
    res.json(conversion);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v2/public/exchange_rates/currencies
 * Get all supported currencies
 */
router.get('/currencies', async (req: Request, res: Response) => {
  try {
    const currencies = await CurrencyService.getSupportedCurrencies();
    res.json(currencies);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/public/exchange_rates/bulk
 * Get multiple exchange rates
 * Query params: base (currency code), targets (comma-separated)
 */
router.get('/bulk', async (req: Request, res: Response) => {
  try {
    const base = req.query.base as string || 'USD';
    const targets = (req.query.targets as string || '').split(',').filter(Boolean);

    if (targets.length === 0) {
      return res.status(400).json({ error: 'targets parameter is required' });
    }

    const rates = await ExchangeRateService.getRates(base, targets);
    res.json({
      base: base.toUpperCase(),
      rates,
      timestamp: new Date(),
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

