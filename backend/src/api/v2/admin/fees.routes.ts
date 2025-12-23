import { Router, Response } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../../../middleware/auth.middleware';
import { FeeService } from '../../../services/FeeService';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Create fee for a fund
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { vcFundId, feeType, rate, calculationMethod, period } = req.body;

    if (!vcFundId || !feeType || rate === undefined || !calculationMethod || !period) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const fee = await FeeService.createFee({
      vcFundId,
      feeType,
      rate,
      calculationMethod,
      period,
    });

    res.status(201).json(fee);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create fee' });
  }
});

// Calculate and charge fee
router.post('/:id/charge', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { periodStart, periodEnd } = req.body;

    if (!periodStart || !periodEnd) {
      return res.status(400).json({ error: 'Period start and end dates are required' });
    }

    const charge = await FeeService.chargeFee({
      feeId: id,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
    });

    res.json(charge);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to charge fee' });
  }
});

// Get fee charges
router.get('/charges', async (req: AuthRequest, res: Response) => {
  try {
    const { feeId, status, page, limit } = req.query;

    const result = await FeeService.getFeeCharges({
      feeId: feeId as string,
      status: status as string,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch fee charges' });
  }
});

// Update charge status
router.patch('/charges/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const charge = await FeeService.updateChargeStatus(id, status);
    res.json(charge);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update charge status' });
  }
});

export default router;

