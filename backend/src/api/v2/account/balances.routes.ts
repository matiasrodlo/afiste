import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../../middleware/auth.middleware';
import prisma from '../../../config/database';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all balances
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { currency_id } = req.query;

    const where: any = { userId: req.user.id };
    if (currency_id) {
      where.currencyId = currency_id;
    }

    const accounts = await prisma.account.findMany({
      where,
      include: {
        currency: {
          select: {
            id: true,
            code: true,
            name: true,
            symbol: true,
          },
        },
      },
    });

    res.json(
      accounts.map((account) => {
        const balance = Number(account.balance);
        const locked = Number(account.locked);
        const available = Math.max(0, balance - locked);
        return {
          currency_id: account.currencyId,
          currency: {
            id: account.currency.id,
            code: account.currency.code,
            name: account.currency.name,
            symbol: account.currency.symbol,
          },
          balance,
          locked,
          available,
        };
      })
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch balances' });
  }
});

// Get balance for specific currency
router.get('/:currency_id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { currency_id } = req.params;

    const account = await prisma.account.findUnique({
      where: {
        userId_currencyId: {
          userId: req.user.id,
          currencyId: currency_id,
        },
      },
      include: {
        currency: {
          select: {
            id: true,
            code: true,
            name: true,
            symbol: true,
          },
        },
      },
    });

    if (!account) {
      // Return zero balance if account doesn't exist
      return res.json({
        currency_id: currency_id,
        balance: 0,
        locked: 0,
        available: 0,
      });
    }

    const balance = Number(account.balance);
    const locked = Number(account.locked);
    const available = Math.max(0, balance - locked);
    res.json({
      currency_id: account.currencyId,
      currency: {
        id: account.currency.id,
        code: account.currency.code,
        name: account.currency.name,
        symbol: account.currency.symbol,
      },
      balance,
      locked,
      available,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch balance' });
  }
});

export default router;

