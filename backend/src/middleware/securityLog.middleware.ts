/**
 * Security Logging Middleware
 * Logs security-relevant events
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SecurityEvent {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
}

export class SecurityLogger {
  /**
   * Log security event
   */
  static async logEvent(event: SecurityEvent): Promise<void> {
    try {
      // In a real implementation, this would write to a security log
      // For now, we'll use console and could add database logging
      console.log('[SECURITY]', {
        type: event.type,
        severity: event.severity,
        userId: event.userId,
        ipAddress: event.ipAddress,
        timestamp: new Date().toISOString(),
        details: event.details,
      });

      // Could also write to database or external logging service
      // await prisma.securityLog.create({ data: { ... } });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Log failed login attempt
   */
  static async logFailedLogin(email: string, ipAddress?: string): Promise<void> {
    await this.logEvent({
      type: 'failed_login',
      severity: 'medium',
      ipAddress,
      details: { email },
    });
  }

  /**
   * Log successful login
   */
  static async logSuccessfulLogin(userId: string, ipAddress?: string): Promise<void> {
    await this.logEvent({
      type: 'successful_login',
      severity: 'low',
      userId,
      ipAddress,
    });
  }

  /**
   * Log 2FA failure
   */
  static async log2FAFailure(userId: string, ipAddress?: string): Promise<void> {
    await this.logEvent({
      type: '2fa_failure',
      severity: 'high',
      userId,
      ipAddress,
    });
  }

  /**
   * Log suspicious activity
   */
  static async logSuspiciousActivity(
    userId: string,
    activity: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logEvent({
      type: 'suspicious_activity',
      severity: 'high',
      userId,
      ipAddress,
      details: { activity },
    });
  }

  /**
   * Log unauthorized access attempt
   */
  static async logUnauthorizedAccess(
    userId: string,
    resource: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logEvent({
      type: 'unauthorized_access',
      severity: 'high',
      userId,
      ipAddress,
      details: { resource },
    });
  }

  /**
   * Log password change
   */
  static async logPasswordChange(userId: string, ipAddress?: string): Promise<void> {
    await this.logEvent({
      type: 'password_change',
      severity: 'medium',
      userId,
      ipAddress,
    });
  }

  /**
   * Log 2FA enabled/disabled
   */
  static async log2FAStatusChange(
    userId: string,
    enabled: boolean,
    ipAddress?: string
  ): Promise<void> {
    await this.logEvent({
      type: enabled ? '2fa_enabled' : '2fa_disabled',
      severity: 'medium',
      userId,
      ipAddress,
    });
  }
}

/**
 * Security logging middleware
 */
export const securityLog = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log security-relevant requests
  const securityRelevantPaths = [
    '/api/v2/public/auth/login',
    '/api/v2/public/auth/register',
    '/api/v2/account/two-factor',
    '/api/v2/account/sessions',
  ];

  if (securityRelevantPaths.some(path => req.path.includes(path))) {
    const userId = (req as any).user?.id;
    const ipAddress = req.ip || req.socket.remoteAddress;

    // Log based on path and method
    if (req.path.includes('/login') && req.method === 'POST') {
      // Will be logged in auth route after verification
    } else if (req.path.includes('/two-factor') && req.method === 'POST') {
      SecurityLogger.log2FAStatusChange(userId || 'unknown', true, ipAddress);
    }

    // Could add more specific logging here
  }

  next();
};

