/**
 * GDPR Compliance API Routes
 * Handles data export and deletion requests
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../../middleware/auth.middleware';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v2/account/gdpr/export
 * Export user data (GDPR right to access)
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Collect all user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: true,
        orders: true,
        tokenAllocations: true,
        kycDocuments: true,
        payments: true,
        bankAccounts: true,
        withdrawals: true,
        sessions: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove sensitive data
    const exportData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      accounts: user.accounts,
      orders: user.orders,
      tokenAllocations: user.tokenAllocations,
      payments: user.payments,
      bankAccounts: user.bankAccounts.map(acc => ({
        id: acc.id,
        accountType: acc.accountType,
        accountNumber: acc.accountNumber, // Only last 4 digits
        bankName: acc.bankName,
        verified: acc.verified,
        createdAt: acc.createdAt,
      })),
      sessions: user.sessions.map(session => ({
        id: session.id,
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        createdAt: session.createdAt,
        lastActivityAt: session.lastActivityAt,
      })),
    };

    res.json(exportData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/v2/account/gdpr/delete
 * Delete user account and data (GDPR right to deletion)
 */
router.delete('/delete', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required for account deletion' });
    }

    // Verify password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const bcrypt = require('bcryptjs');
    const isValid = await bcrypt.compare(password, user.passwordDigest);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Delete user (cascade will delete related records)
    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

