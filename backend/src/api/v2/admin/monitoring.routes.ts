/**
 * Blockchain Monitoring API Routes
 * 
 * Admin endpoints for monitoring blockchain health and metrics
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../../../middleware/auth.middleware';
import { getBlockchainMonitor } from '../../../monitoring/blockchain';

const router = Router();
const monitor = getBlockchainMonitor();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/v2/admin/monitoring/metrics
 * Get current monitoring metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await monitor.getMetrics();
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/admin/monitoring/alerts
 * Get recent alerts
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const alerts = monitor.getAlerts(limit);
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/admin/monitoring/health
 * Check sync health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await monitor.checkSyncHealth();
    res.json(health);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/admin/monitoring/stats
 * Get transaction statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const timeframe = (req.query.timeframe as '1h' | '24h' | '7d' | '30d') || '24h';
    const stats = await monitor.getTransactionStats(timeframe);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/admin/monitoring/check
 * Manually trigger anomaly check
 */
router.post('/check', async (req: Request, res: Response) => {
  try {
    const alerts = await monitor.checkAnomalies();
    res.json({ alerts, count: alerts.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

