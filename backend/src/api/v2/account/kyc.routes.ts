import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../../middleware/auth.middleware';
import { KYCService } from '../../../services/KYCService';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Upload KYC document
router.post('/documents', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { documentType, documentUrl } = req.body;

    if (!documentType || !documentUrl) {
      return res.status(400).json({ error: 'Document type and URL are required' });
    }

    const document = await KYCService.uploadDocument({
      userId: req.user.id,
      documentType,
      documentUrl,
    });

    res.status(201).json(document);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to upload document' });
  }
});

// Get user KYC status
router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const status = await KYCService.getUserKYCStatus(req.user.id);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch KYC status' });
  }
});

// Get user documents
router.get('/documents', async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const documents = await KYCService.getUserDocuments(req.user.id);
    res.json({ data: documents });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch documents' });
  }
});

export default router;

