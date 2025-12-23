import { Router, Response } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../../../middleware/auth.middleware';
import { TokenOfferingService } from '../../../services/TokenOfferingService';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Create token offering
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      vcFundId,
      offeringType,
      startDate,
      endDate,
      offeringPrice,
      minInvestment,
      maxInvestment,
      totalTokensOffered,
      whitelistRequired,
      description,
    } = req.body;

    if (!vcFundId || !startDate || !offeringPrice || !minInvestment || !totalTokensOffered) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const offering = await TokenOfferingService.createOffering({
      vcFundId,
      offeringType,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      offeringPrice,
      minInvestment,
      maxInvestment,
      totalTokensOffered,
      whitelistRequired,
      description,
    });

    res.status(201).json(offering);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create offering' });
  }
});

// List offerings
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, vcFundId, page, limit } = req.query;

    const result = await TokenOfferingService.listOfferings({
      status: status as string,
      vcFundId: vcFundId as string,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch offerings' });
  }
});

// Get offering details
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const offering = await TokenOfferingService.getOffering(id);

    if (!offering) {
      return res.status(404).json({ error: 'Offering not found' });
    }

    res.json(offering);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch offering' });
  }
});

// Update offering status
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const offering = await TokenOfferingService.updateOfferingStatus(id, status);
    res.json(offering);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update offering status' });
  }
});

export default router;

