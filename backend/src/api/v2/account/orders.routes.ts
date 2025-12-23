import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../../middleware/auth.middleware';
import { OrderService } from '../../../services/OrderService';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create order
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { market_id, side, ord_type, price, volume } = req.body;

    if (!market_id || !side || !ord_type || !volume) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({ error: 'Invalid side. Must be buy or sell' });
    }

    if (!['limit', 'market'].includes(ord_type)) {
      return res.status(400).json({ error: 'Invalid ord_type. Must be limit or market' });
    }

    const order = await OrderService.createOrder({
      userId: req.user.id,
      marketId: market_id,
      side: side as 'buy' | 'sell',
      ordType: ord_type as 'limit' | 'market',
      price: price ? Number(price) : undefined,
      volume: Number(volume),
    });

    res.status(201).json(order);
  } catch (error: any) {
    if (error.name === 'InsufficientFundsError' || error.name === 'InvalidOrderError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to create order' });
  }
});

// Get user orders
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { market_id, state, limit, offset } = req.query;

    const orders = await OrderService.getUserOrders(req.user.id, {
      marketId: market_id as string | undefined,
      state: state as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch orders' });
  }
});

// Get order details
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const orders = await OrderService.getUserOrders(req.user.id);
    const order = orders.find((o) => o.id === id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch order' });
  }
});

// Cancel order
router.post('/:id/cancel', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const order = await OrderService.cancelOrder(id, req.user.id);

    res.json({
      message: 'Order cancelled successfully',
      order: {
        id: order.id,
        state: order.state,
      },
    });
  } catch (error: any) {
    if (error.name === 'InvalidOrderError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Failed to cancel order' });
  }
});

export default router;

