/**
 * Two-Factor Authentication API Routes
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../../middleware/auth.middleware';
import { TwoFactorService } from '../../../services/TwoFactorService';
import { AuthService } from '../../../services/AuthService';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v2/account/two-factor/setup
 * Setup 2FA (generate secret and QR code)
 */
router.post('/setup', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const email = (req as any).user.email;

    const result = await TwoFactorService.setup2FA(userId, email);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v2/account/two-factor/verify
 * Verify 2FA token and enable 2FA
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const verified = await TwoFactorService.verifyAndEnable2FA(userId, token);
    if (verified) {
      res.json({ message: '2FA enabled successfully' });
    } else {
      res.status(400).json({ error: 'Invalid token' });
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v2/account/two-factor/verify-backup
 * Verify backup code
 */
router.post('/verify-backup', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Backup code is required' });
    }

    const verified = await TwoFactorService.verifyBackupCode(userId, code);
    if (verified) {
      res.json({ message: 'Backup code verified' });
    } else {
      res.status(400).json({ error: 'Invalid backup code' });
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/v2/account/two-factor
 * Disable 2FA
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    await TwoFactorService.disable2FA(userId, password);
    res.json({ message: '2FA disabled successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v2/account/two-factor/regenerate-backup-codes
 * Regenerate backup codes
 */
router.post('/regenerate-backup-codes', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const backupCodes = await TwoFactorService.regenerateBackupCodes(userId);
    res.json({ backupCodes });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/v2/account/two-factor/status
 * Get 2FA status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const enabled = await TwoFactorService.is2FAEnabled(userId);
    res.json({ enabled });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

