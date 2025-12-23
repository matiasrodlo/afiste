import { Router, Request, Response } from 'express';
import prisma from '../../../config/database';

const router = Router();

// Get trades for a market
router.get('/:market', async (req: Request, res: Response) => {
  try {
    const { market } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    const marketRecord = await prisma.market.findUnique({
      where: { id: market },
    });

    if (!marketRecord) {
      return res.status(404).json({ error: 'Market not found' });
    }

    const trades = await prisma.trade.findMany({
      where: { marketId: market },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10),
      skip: parseInt(offset as string, 10),
    });

    res.json(
      trades.map((trade) => ({
        id: trade.id,
        marketId: trade.marketId,
        price: Number(trade.price),
        volume: Number(trade.volume),
        funds: Number(trade.funds),
        trend: trade.trend,
        createdAt: trade.createdAt,
      }))
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch trades' });
  }
});

export default router;

