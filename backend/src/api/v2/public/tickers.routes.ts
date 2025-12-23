import { Router, Request, Response } from 'express';
import prisma from '../../../config/database';

const router = Router();

// Get tickers for all markets
router.get('/', async (req: Request, res: Response) => {
  try {
    const markets = await prisma.market.findMany({
      where: { state: 'active' },
      include: {
        baseCurrency: true,
        quoteCurrency: true,
      },
    });

    // Get latest trades for each market
    const tickers = await Promise.all(
      markets.map(async (market) => {
        const latestTrade = await prisma.trade.findFirst({
          where: { marketId: market.id },
          orderBy: { createdAt: 'desc' },
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTrades = await prisma.trade.findMany({
          where: {
            marketId: market.id,
            createdAt: { gte: today },
          },
        });

        const volume24h = todayTrades.reduce((sum, trade) => sum + Number(trade.volume), 0);
        const high24h = todayTrades.length > 0
          ? Math.max(...todayTrades.map((t) => Number(t.price)))
          : latestTrade ? Number(latestTrade.price) : 0;
        const low24h = todayTrades.length > 0
          ? Math.min(...todayTrades.map((t) => Number(t.price)))
          : latestTrade ? Number(latestTrade.price) : 0;

        return {
          market: market.id,
          baseUnit: market.baseUnit,
          quoteUnit: market.quoteUnit,
          last: latestTrade ? Number(latestTrade.price) : market.currentNav ? Number(market.currentNav) : 0,
          open: latestTrade ? Number(latestTrade.price) : market.currentNav ? Number(market.currentNav) : 0,
          high: high24h,
          low: low24h,
          volume: volume24h,
          amount: volume24h,
          at: latestTrade ? latestTrade.createdAt : new Date(),
        };
      })
    );

    res.json(tickers);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch tickers' });
  }
});

// Get ticker for specific market
router.get('/:market', async (req: Request, res: Response) => {
  try {
    const { market } = req.params;

    const marketRecord = await prisma.market.findUnique({
      where: { id: market },
    });

    if (!marketRecord) {
      return res.status(404).json({ error: 'Market not found' });
    }

    const latestTrade = await prisma.trade.findFirst({
      where: { marketId: market },
      orderBy: { createdAt: 'desc' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTrades = await prisma.trade.findMany({
      where: {
        marketId: market,
        createdAt: { gte: today },
      },
    });

    const volume24h = todayTrades.reduce((sum, trade) => sum + Number(trade.volume), 0);
    const high24h = todayTrades.length > 0
      ? Math.max(...todayTrades.map((t) => Number(t.price)))
      : latestTrade ? Number(latestTrade.price) : 0;
    const low24h = todayTrades.length > 0
      ? Math.min(...todayTrades.map((t) => Number(t.price)))
      : latestTrade ? Number(latestTrade.price) : 0;

    res.json({
      market: marketRecord.id,
      baseUnit: marketRecord.baseUnit,
      quoteUnit: marketRecord.quoteUnit,
      last: latestTrade ? Number(latestTrade.price) : marketRecord.currentNav ? Number(marketRecord.currentNav) : 0,
      open: latestTrade ? Number(latestTrade.price) : marketRecord.currentNav ? Number(marketRecord.currentNav) : 0,
      high: high24h,
      low: low24h,
      volume: volume24h,
      amount: volume24h,
      at: latestTrade ? latestTrade.createdAt : new Date(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch ticker' });
  }
});

export default router;

