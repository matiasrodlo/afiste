import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../../middleware/auth.middleware';
import prisma from '../../../config/database';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get user trades
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { market_id, limit = '50', offset = '0' } = req.query;

    const where: any = {
      OR: [{ askUserId: req.user.id }, { bidUserId: req.user.id }],
    };

    if (market_id) {
      where.marketId = market_id;
    }

    const trades = await prisma.trade.findMany({
      where,
      include: {
        market: {
          select: {
            id: true,
            baseUnit: true,
            quoteUnit: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10),
      skip: parseInt(offset as string, 10),
    });

    res.json(
      trades.map((trade) => ({
        id: trade.id,
        marketId: trade.marketId,
        market: trade.market,
        side: trade.askUserId === req.user!.id ? 'sell' : 'buy',
        price: Number(trade.price),
        volume: Number(trade.volume),
        funds: Number(trade.funds),
        createdAt: trade.createdAt,
      }))
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch trades' });
  }
});

export default router;

