import { Router, Request, Response } from 'express';
import prisma from '../../../config/database';

const router = Router();

// Get order book for a market
router.get('/:market', async (req: Request, res: Response) => {
  try {
    const { market } = req.params;
    const { limit = '20' } = req.query;

    const marketRecord = await prisma.market.findUnique({
      where: { id: market },
    });

    if (!marketRecord) {
      return res.status(404).json({ error: 'Market not found' });
    }

    const limitNum = parseInt(limit as string, 10);

    // Get buy orders (bids) - sorted by price descending
    const bids = await prisma.order.findMany({
      where: {
        marketId: market,
        side: 'buy',
        state: 'wait',
      },
      orderBy: [{ price: 'desc' }, { createdAt: 'asc' }],
      take: limitNum,
    });

    // Get sell orders (asks) - sorted by price ascending
    const asks = await prisma.order.findMany({
      where: {
        marketId: market,
        side: 'sell',
        state: 'wait',
      },
      orderBy: [{ price: 'asc' }, { createdAt: 'asc' }],
      take: limitNum,
    });

    // Aggregate by price
    const aggregateOrders = (orders: any[]) => {
      const aggregated: Record<string, { price: number; volume: number }> = {};
      orders.forEach((order) => {
        const price = order.price ? Number(order.price).toFixed(8) : 'market';
        const remainingVolume = Number(order.volume) - Number(order.filledVolume);
        if (remainingVolume > 0) {
          if (!aggregated[price]) {
            aggregated[price] = { price: Number(order.price || 0), volume: 0 };
          }
          aggregated[price].volume += remainingVolume;
        }
      });
      return Object.values(aggregated);
    };

    res.json({
      bids: aggregateOrders(bids),
      asks: aggregateOrders(asks),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch order book' });
  }
});

export default router;

