import { Router, Response, Request } from 'express';
import { TokenOfferingService } from '../../../services/TokenOfferingService';

const router = Router();

// List active offerings
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, page, limit } = req.query;

    const result = await TokenOfferingService.listOfferings({
      status: (status as string) || 'active',
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch offerings' });
  }
});

// Get offering details (public)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const offering = await TokenOfferingService.getOffering(id);

    if (!offering) {
      return res.status(404).json({ error: 'Offering not found' });
    }

    // Remove sensitive allocation data for public view
    const publicOffering = {
      ...offering,
      allocations: offering.allocations.map((allocation) => ({
        purchasedTokens: allocation.purchasedTokens,
        // Don't expose user details in public view
      })),
    };

    res.json(publicOffering);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch offering' });
  }
});

export default router;

