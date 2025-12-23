import { Router, Request, Response } from 'express';
import prisma from '../../../config/database';

const router = Router();

// Get list of markets
router.get('/', async (req: Request, res: Response) => {
  try {
    const { state } = req.query;

    const where: any = {};
    if (state) {
      where.state = state;
    }

    const markets = await prisma.market.findMany({
      where,
      include: {
        baseCurrency: {
          select: {
            id: true,
            code: true,
            name: true,
            symbol: true,
          },
        },
        quoteCurrency: {
          select: {
            id: true,
            code: true,
            name: true,
            symbol: true,
          },
        },
      },
      orderBy: { position: 'asc' },
    });

    res.json(
      markets.map((market) => ({
        id: market.id,
        baseUnit: market.baseUnit,
        quoteUnit: market.quoteUnit,
        baseCurrency: market.baseCurrency,
        quoteCurrency: market.quoteCurrency,
        amountPrecision: market.amountPrecision,
        pricePrecision: market.pricePrecision,
        minPrice: Number(market.minPrice),
        maxPrice: Number(market.maxPrice),
        minAmount: Number(market.minAmount),
        position: market.position,
        state: market.state,
        type: market.type,
        vcFundId: market.vcFundId,
        initialOfferingPrice: market.initialOfferingPrice ? Number(market.initialOfferingPrice) : null,
        currentNav: market.currentNav ? Number(market.currentNav) : null,
      }))
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch markets' });
  }
});

// Get market details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const market = await prisma.market.findUnique({
      where: { id },
      include: {
        baseCurrency: true,
        quoteCurrency: true,
      },
    });

    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }

    res.json({
      id: market.id,
      baseUnit: market.baseUnit,
      quoteUnit: market.quoteUnit,
      baseCurrency: market.baseCurrency,
      quoteCurrency: market.quoteCurrency,
      amountPrecision: market.amountPrecision,
      pricePrecision: market.pricePrecision,
      minPrice: Number(market.minPrice),
      maxPrice: Number(market.maxPrice),
      minAmount: Number(market.minAmount),
      position: market.position,
      state: market.state,
      type: market.type,
      vcFundId: market.vcFundId,
      initialOfferingPrice: market.initialOfferingPrice ? Number(market.initialOfferingPrice) : null,
      currentNav: market.currentNav ? Number(market.currentNav) : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch market' });
  }
});

export default router;

