/**
 * Session Management API Routes
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../../../middleware/auth.middleware';
import { SessionService } from '../../../services/SessionService';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v2/account/sessions
 * Get user's active sessions
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const sessionToken = (req as any).sessionToken; // Set by middleware

    const sessions = await SessionService.getUserSessions(userId, sessionToken);
    res.json(sessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/v2/account/sessions/:id
 * Revoke a specific session
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    // Verify session belongs to user
    const sessions = await SessionService.getUserSessions(userId);
    const session = sessions.find(s => s.id === id);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get session token from database
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const sessionRecord = await prisma.session.findUnique({
      where: { id },
    });

    if (sessionRecord) {
      await SessionService.revokeSession(sessionRecord.token);
    }

    res.json({ message: 'Session revoked' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/v2/account/sessions
 * Revoke all sessions except current
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const sessionToken = (req as any).sessionToken;

    await SessionService.revokeAllUserSessions(userId, sessionToken);
    res.json({ message: 'All other sessions revoked' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

