import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../../middleware/auth.middleware';
import { TokenOfferingService } from '../../../services/TokenOfferingService';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Purchase tokens in an offering
router.post('/:id/purchase', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount is required and must be greater than 0' });
    }

    const result = await TokenOfferingService.purchaseTokens({
      offeringId: id,
      userId: req.user.id,
      amount,
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to purchase tokens' });
  }
});

// Get user's allocations
router.get('/my-allocations', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // This would require a new method in TokenOfferingService
    // For now, return empty array
    res.json({ data: [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch allocations' });
  }
});

export default router;

