/**
 * Security Monitoring Service
 * Monitors security events and detects anomalies
 */

import { PrismaClient } from '@prisma/client';
import { SecurityLogger } from '../middleware/securityLog.middleware';

const prisma = new PrismaClient();

export interface SecurityMetrics {
  failedLogins24h: number;
  successfulLogins24h: number;
  twoFactorFailures24h: number;
  suspiciousActivities24h: number;
  unauthorizedAccess24h: number;
  activeSessions: number;
  lockedAccounts: number;
}

export interface SecurityAlert {
  level: 'info' | 'warning' | 'error' | 'critical';
  type: string;
  message: string;
  timestamp: Date;
  details?: any;
}

export class SecurityMonitor {
  /**
   * Get security metrics
   */
  static async getMetrics(): Promise<SecurityMetrics> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get locked accounts
    const lockedAccounts = await prisma.user.count({
      where: {
        lockedUntil: { gt: new Date() },
      },
    });

    // Get active sessions
    const activeSessions = await prisma.session.count({
      where: {
        revoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    // Note: In a real implementation, we would query security logs
    // For now, we'll return placeholder metrics
    return {
      failedLogins24h: 0, // Would query security logs
      successfulLogins24h: 0,
      twoFactorFailures24h: 0,
      suspiciousActivities24h: 0,
      unauthorizedAccess24h: 0,
      activeSessions,
      lockedAccounts,
    };
  }

  /**
   * Check for security anomalies
   */
  static async checkAnomalies(): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    const metrics = await this.getMetrics();

    // Check for high failed login rate
    if (metrics.failedLogins24h > 100) {
      alerts.push({
        level: 'warning',
        type: 'high_failed_logins',
        message: `High number of failed logins in last 24h: ${metrics.failedLogins24h}`,
        timestamp: new Date(),
        details: { count: metrics.failedLogins24h },
      });
    }

    // Check for high 2FA failures
    if (metrics.twoFactorFailures24h > 20) {
      alerts.push({
        level: 'error',
        type: 'high_2fa_failures',
        message: `High number of 2FA failures in last 24h: ${metrics.twoFactorFailures24h}`,
        timestamp: new Date(),
        details: { count: metrics.twoFactorFailures24h },
      });
    }

    // Check for suspicious activities
    if (metrics.suspiciousActivities24h > 10) {
      alerts.push({
        level: 'error',
        type: 'suspicious_activities',
        message: `Multiple suspicious activities detected: ${metrics.suspiciousActivities24h}`,
        timestamp: new Date(),
        details: { count: metrics.suspiciousActivities24h },
      });
    }

    // Check for unauthorized access attempts
    if (metrics.unauthorizedAccess24h > 5) {
      alerts.push({
        level: 'critical',
        type: 'unauthorized_access',
        message: `Unauthorized access attempts detected: ${metrics.unauthorizedAccess24h}`,
        timestamp: new Date(),
        details: { count: metrics.unauthorizedAccess24h },
      });
    }

    // Check for many locked accounts
    if (metrics.lockedAccounts > 50) {
      alerts.push({
        level: 'warning',
        type: 'many_locked_accounts',
        message: `High number of locked accounts: ${metrics.lockedAccounts}`,
        timestamp: new Date(),
        details: { count: metrics.lockedAccounts },
      });
    }

    return alerts;
  }

  /**
   * Detect suspicious login patterns
   */
  static async detectSuspiciousLogin(userId: string, ipAddress?: string): Promise<boolean> {
    // Check for multiple logins from different IPs in short time
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentSessions = await prisma.session.findMany({
      where: {
        userId,
        createdAt: { gte: oneHourAgo },
        revoked: false,
      },
    });

    // Count unique IPs
    const uniqueIPs = new Set(recentSessions.map(s => s.ipAddress).filter(Boolean));
    
    if (uniqueIPs.size > 3) {
      // Multiple IPs in short time - suspicious
      await SecurityLogger.logSuspiciousActivity(
        userId,
        'Multiple logins from different IPs',
        ipAddress
      );
      return true;
    }

    return false;
  }

  /**
   * Start monitoring (runs checks periodically)
   */
  static startMonitoring(intervalMs: number = 300000): void { // 5 minutes
    setInterval(async () => {
      try {
        const alerts = await this.checkAnomalies();
        if (alerts.length > 0) {
          console.log('[SECURITY MONITOR] Alerts:', alerts);
          // In production, send alerts to monitoring system
        }
      } catch (error) {
        console.error('Security monitoring error:', error);
      }
    }, intervalMs);
  }
}

