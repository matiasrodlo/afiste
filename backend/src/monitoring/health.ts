/**
 * Health Check Service
 * Provides health check endpoints for monitoring
 */

import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
    };
    memory: {
      status: 'healthy' | 'unhealthy';
      used: number;
      total: number;
      percentage: number;
    };
  };
  version: string;
}

export class HealthService {
  /**
   * Check database health
   */
  static async checkDatabase(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime?: number }> {
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
      };
    }
  }

  /**
   * Check memory usage
   */
  static checkMemory(): { status: 'healthy' | 'unhealthy'; used: number; total: number; percentage: number } {
    const usage = process.memoryUsage();
    const used = usage.heapUsed;
    const total = usage.heapTotal;
    const percentage = (used / total) * 100;

    // Consider unhealthy if using more than 90% of heap
    const status = percentage > 90 ? 'unhealthy' : 'healthy';

    return {
      status,
      used: Math.round(used / 1024 / 1024), // MB
      total: Math.round(total / 1024 / 1024), // MB
      percentage: Math.round(percentage * 100) / 100,
    };
  }

  /**
   * Get overall health status
   */
  static async getHealthStatus(): Promise<HealthStatus> {
    const [database, memory] = await Promise.all([
      this.checkDatabase(),
      Promise.resolve(this.checkMemory()),
    ]);

    // Determine overall status
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (database.status === 'unhealthy' || memory.status === 'unhealthy') {
      status = 'unhealthy';
    } else if (memory.percentage > 80) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database,
        memory,
      },
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * Health check endpoint handler
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.getHealthStatus();

      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  }

  /**
   * Readiness check (for Kubernetes)
   */
  static async readinessCheck(req: Request, res: Response): Promise<void> {
    try {
      const database = await this.checkDatabase();
      
      if (database.status === 'healthy') {
        res.status(200).json({ status: 'ready' });
      } else {
        res.status(503).json({ status: 'not ready' });
      }
    } catch (error) {
      res.status(503).json({ status: 'not ready' });
    }
  }

  /**
   * Liveness check (for Kubernetes)
   */
  static async livenessCheck(req: Request, res: Response): Promise<void> {
    res.status(200).json({ status: 'alive' });
  }
}

