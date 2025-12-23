/**
 * Session Management Service
 * Handles user sessions and device tracking
 */

import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const SESSION_EXPIRY_HOURS = 24 * 7; // 7 days

export interface CreateSessionParams {
  userId: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionInfo {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  lastActivityAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

export class SessionService {
  /**
   * Create a new session
   */
  static async createSession(params: CreateSessionParams): Promise<string> {
    const { userId, deviceInfo, ipAddress, userAgent } = params;

    // Generate session token
    const token = crypto.randomBytes(32).toString('hex');

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + SESSION_EXPIRY_HOURS);

    // Create session
    await prisma.session.create({
      data: {
        userId,
        token,
        deviceInfo,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Verify session token
   */
  static async verifySession(token: string): Promise<{ userId: string } | null> {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) {
      return null;
    }

    // Check if session is revoked
    if (session.revoked) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await prisma.session.update({
        where: { id: session.id },
        data: { revoked: true, revokedAt: new Date() },
      });
      return null;
    }

    // Check if user is active
    if (!session.user.isActive) {
      return null;
    }

    // Update last activity
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    });

    return { userId: session.userId };
  }

  /**
   * Revoke session
   */
  static async revokeSession(token: string): Promise<void> {
    await prisma.session.update({
      where: { token },
      data: {
        revoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Revoke all user sessions
   */
  static async revokeAllUserSessions(userId: string, exceptToken?: string): Promise<void> {
    const where: any = {
      userId,
      revoked: false,
    };

    if (exceptToken) {
      where.token = { not: exceptToken };
    }

    await prisma.session.updateMany({
      where,
      data: {
        revoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Revoke expired sessions
   */
  static async revokeExpiredSessions(): Promise<number> {
    const result = await prisma.session.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        revoked: false,
      },
      data: {
        revoked: true,
        revokedAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Get user sessions
   */
  static async getUserSessions(userId: string, currentToken?: string): Promise<SessionInfo[]> {
    const sessions = await prisma.session.findMany({
      where: {
        userId,
        revoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    return sessions.map(session => ({
      id: session.id,
      deviceInfo: session.deviceInfo,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
      isCurrent: currentToken ? session.token === currentToken : false,
    }));
  }

  /**
   * Clean up old sessions (should be run periodically)
   */
  static async cleanupOldSessions(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.session.deleteMany({
      where: {
        OR: [
          { revoked: true, revokedAt: { lt: thirtyDaysAgo } },
          { expiresAt: { lt: thirtyDaysAgo } },
        ],
      },
    });

    return result.count;
  }
}

