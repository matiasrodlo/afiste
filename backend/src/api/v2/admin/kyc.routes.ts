import { Router, Response } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../../../middleware/auth.middleware';
import { KYCService } from '../../../services/KYCService';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Verify KYC document
router.patch('/documents/:id/verify', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!status || !['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status (verified/rejected) is required' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const document = await KYCService.verifyDocument({
      documentId: id,
      verifiedBy: req.user.id,
      status,
      rejectionReason,
    });

    res.json(document);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to verify document' });
  }
});

// Update user KYC level
router.patch('/users/:id/kyc-level', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { kycLevel, kycStatus, notes } = req.body;

    if (!kycLevel || !kycStatus) {
      return res.status(400).json({ error: 'KYC level and status are required' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await KYCService.updateKYCLevel({
      userId: id,
      kycLevel,
      kycStatus,
      verifiedBy: req.user.id,
      notes,
    });

    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to update KYC level' });
  }
});

// Review AML transaction
router.patch('/aml-transactions/:id/review', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reviewStatus, notes } = req.body;

    if (!reviewStatus || !['cleared', 'blocked'].includes(reviewStatus)) {
      return res.status(400).json({ error: 'Valid review status (cleared/blocked) is required' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const transaction = await KYCService.reviewAMLTransaction(id, req.user.id, reviewStatus, notes);
    res.json(transaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to review AML transaction' });
  }
});

// List pending documents
router.get('/documents/pending', async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit } = req.query;

    // This would require a new method in KYCService
    // For now, return empty
    res.json({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch pending documents' });
  }
});

export default router;

