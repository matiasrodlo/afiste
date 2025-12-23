import { Router, Response, Request } from 'express';
import { FeeService } from '../../../services/FeeService';

const router = Router();

// Get fees for a fund (public)
router.get('/funds/:fundId', async (req: Request, res: Response) => {
  try {
    const { fundId } = req.params;
    const fees = await FeeService.getFundFees(fundId);
    res.json({ data: fees });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch fees' });
  }
});

export default router;

