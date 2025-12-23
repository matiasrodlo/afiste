/**
 * Blockchain Monitoring Service
 * 
 * Monitors blockchain contracts for:
 * - Event emissions
 * - Transaction status
 * - Sync health
 * - Anomalies
 */

import { PrismaClient } from '@prisma/client';
import { BlockchainService } from '../services/blockchain/BlockchainService';
import { BlockchainEventListener } from '../services/blockchain/BlockchainEventListener';
import { BlockchainSyncService } from '../services/blockchain/BlockchainSyncService';

const prisma = new PrismaClient();

export interface MonitoringMetrics {
  lastSyncedBlock: number;
  syncLag: number; // blocks behind
  eventsProcessed: number;
  eventsFailed: number;
  transactionsPending: number;
  transactionsConfirmed: number;
  transactionsFailed: number;
  averageConfirmationTime: number; // seconds
  gasUsed: bigint;
  errorRate: number; // percentage
}

export interface Alert {
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  details?: any;
}

export class BlockchainMonitor {
  private blockchainService: BlockchainService;
  private eventListener: BlockchainEventListener;
  private syncService: BlockchainSyncService;
  private alerts: Alert[] = [];
  private metrics: MonitoringMetrics | null = null;

  constructor() {
    this.blockchainService = new BlockchainService();
    this.eventListener = new BlockchainEventListener();
    this.syncService = new BlockchainSyncService();
  }

  /**
   * Get current monitoring metrics
   */
  async getMetrics(): Promise<MonitoringMetrics> {
    const currentBlock = await this.blockchainService.getBlockNumber();
    
    // Get sync states
    const syncStates = await prisma.blockchainSyncState.findMany();
    const latestSync = syncStates.reduce((latest, state) => {
      return state.lastProcessedBlock > latest ? state.lastProcessedBlock : latest;
    }, 0);

    const syncLag = currentBlock - latestSync;

    // Get transaction stats
    const transactions = await prisma.blockchainTransaction.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    const pending = transactions.filter(t => t.status === 'pending').length;
    const confirmed = transactions.filter(t => t.status === 'confirmed').length;
    const failed = transactions.filter(t => t.status === 'failed').length;

    // Calculate average confirmation time
    const confirmedTxs = transactions.filter(t => t.status === 'confirmed' && t.confirmedAt);
    const avgConfirmationTime = confirmedTxs.length > 0
      ? confirmedTxs.reduce((sum, tx) => {
          const time = tx.confirmedAt!.getTime() - tx.createdAt.getTime();
          return sum + time / 1000; // Convert to seconds
        }, 0) / confirmedTxs.length
      : 0;

    // Get event stats
    const events = await prisma.blockchainEvent.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    const eventsProcessed = events.length;
    const eventsFailed = events.filter(e => e.processed === false).length;

    // Calculate gas used
    const gasUsed = transactions
      .filter(t => t.gasUsed)
      .reduce((sum, t) => sum + BigInt(t.gasUsed?.toString() || '0'), BigInt(0));

    // Calculate error rate
    const totalTransactions = transactions.length;
    const errorRate = totalTransactions > 0
      ? (failed / totalTransactions) * 100
      : 0;

    this.metrics = {
      lastSyncedBlock: latestSync,
      syncLag,
      eventsProcessed,
      eventsFailed,
      transactionsPending: pending,
      transactionsConfirmed: confirmed,
      transactionsFailed: failed,
      averageConfirmationTime: avgConfirmationTime,
      gasUsed,
      errorRate,
    };

    return this.metrics;
  }

  /**
   * Check for anomalies and generate alerts
   */
  async checkAnomalies(): Promise<Alert[]> {
    const metrics = await this.getMetrics();
    const alerts: Alert[] = [];

    // Check sync lag
    if (metrics.syncLag > 100) {
      alerts.push({
        level: 'warning',
        message: `Sync lag is high: ${metrics.syncLag} blocks behind`,
        timestamp: new Date(),
        details: { syncLag: metrics.syncLag },
      });
    }

    if (metrics.syncLag > 1000) {
      alerts.push({
        level: 'error',
        message: `Sync lag is critical: ${metrics.syncLag} blocks behind`,
        timestamp: new Date(),
        details: { syncLag: metrics.syncLag },
      });
    }

    // Check error rate
    if (metrics.errorRate > 5) {
      alerts.push({
        level: 'warning',
        message: `High error rate: ${metrics.errorRate.toFixed(2)}%`,
        timestamp: new Date(),
        details: { errorRate: metrics.errorRate },
      });
    }

    if (metrics.errorRate > 20) {
      alerts.push({
        level: 'critical',
        message: `Critical error rate: ${metrics.errorRate.toFixed(2)}%`,
        timestamp: new Date(),
        details: { errorRate: metrics.errorRate },
      });
    }

    // Check pending transactions
    if (metrics.transactionsPending > 50) {
      alerts.push({
        level: 'warning',
        message: `High number of pending transactions: ${metrics.transactionsPending}`,
        timestamp: new Date(),
        details: { pending: metrics.transactionsPending },
      });
    }

    // Check event processing failures
    if (metrics.eventsFailed > 10) {
      alerts.push({
        level: 'error',
        message: `Multiple event processing failures: ${metrics.eventsFailed}`,
        timestamp: new Date(),
        details: { failed: metrics.eventsFailed },
      });
    }

    // Check confirmation time
    if (metrics.averageConfirmationTime > 300) { // 5 minutes
      alerts.push({
        level: 'warning',
        message: `Slow transaction confirmations: ${metrics.averageConfirmationTime.toFixed(2)}s average`,
        timestamp: new Date(),
        details: { avgTime: metrics.averageConfirmationTime },
      });
    }

    this.alerts = alerts;
    return alerts;
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit: number = 50): Alert[] {
    return this.alerts.slice(0, limit);
  }

  /**
   * Check sync health
   */
  async checkSyncHealth(): Promise<{
    healthy: boolean;
    issues: string[];
  }> {
    const metrics = await this.getMetrics();
    const issues: string[] = [];

    if (metrics.syncLag > 100) {
      issues.push(`Sync lag: ${metrics.syncLag} blocks`);
    }

    if (metrics.errorRate > 10) {
      issues.push(`High error rate: ${metrics.errorRate.toFixed(2)}%`);
    }

    const syncStates = await prisma.blockchainSyncState.findMany({
      where: {
        OR: [
          { errorCount: { gt: 0 } },
          { lastError: { not: null } },
        ],
      },
    });

    if (syncStates.length > 0) {
      issues.push(`${syncStates.length} sync states in error`);
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    failed: number;
    successRate: number;
    averageGasUsed: bigint;
  }> {
    const timeframes = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };

    const since = new Date(Date.now() - timeframes[timeframe]);

    const transactions = await prisma.blockchainTransaction.findMany({
      where: {
        createdAt: {
          gte: since,
        },
      },
    });

    const total = transactions.length;
    const pending = transactions.filter(t => t.status === 'pending').length;
    const confirmed = transactions.filter(t => t.status === 'confirmed').length;
    const failed = transactions.filter(t => t.status === 'failed').length;

    const successRate = total > 0
      ? ((confirmed / total) * 100)
      : 0;

    const gasUsed = transactions
      .filter(t => t.gasUsed)
      .map(t => BigInt(t.gasUsed?.toString() || '0'));

    const averageGasUsed = gasUsed.length > 0
      ? gasUsed.reduce((sum, gas) => sum + gas, BigInt(0)) / BigInt(gasUsed.length)
      : BigInt(0);

    return {
      total,
      pending,
      confirmed,
      failed,
      successRate,
      averageGasUsed,
    };
  }

  /**
   * Start monitoring (runs checks periodically)
   */
  startMonitoring(intervalMs: number = 60000): void {
    setInterval(async () => {
      try {
        await this.checkAnomalies();
        await this.checkSyncHealth();
      } catch (error) {
        console.error('Monitoring error:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    // In a real implementation, this would clear the interval
    // For now, it's a placeholder
  }
}

// Singleton instance
let monitorInstance: BlockchainMonitor | null = null;

export const getBlockchainMonitor = (): BlockchainMonitor => {
  if (!monitorInstance) {
    monitorInstance = new BlockchainMonitor();
  }
  return monitorInstance;
};

