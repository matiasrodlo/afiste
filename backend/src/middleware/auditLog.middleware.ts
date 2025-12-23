import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import prisma from '../config/database';

interface AuditLogData {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
}

export const auditLog = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();
  const originalSend = res.send;

  // Override res.send to capture response
  res.send = function (body: any) {
    const duration = Date.now() - startTime;
    const status = res.statusCode >= 200 && res.statusCode < 400 ? 'success' : 'failure';

    // Log financial operations asynchronously (don't block response)
    logAuditEvent({
      userId: req.user?.id,
      action: req.method,
      resource: req.path,
      resourceId: extractResourceId(req),
      details: {
        query: req.query,
        body: sanitizeBody(req.body),
        statusCode: res.statusCode,
        duration,
      },
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      status,
      errorMessage: status === 'failure' ? body?.error : undefined,
    }).catch((err) => {
      console.error('Failed to log audit event:', err);
    });

    return originalSend.call(this, body);
  };

  next();
};

// Log specific financial operations
export const logFinancialOperation = async (data: AuditLogData): Promise<void> => {
  try {
    // In production, store in database or logging service
    // For MVP, we'll use console logging and optionally store in database
    
    const logEntry = {
      timestamp: new Date(),
      ...data,
    };

    // Store in database if audit_logs table exists
    // For now, we'll use console logging
    console.log('[AUDIT]', JSON.stringify(logEntry, null, 2));

    // Optional: Store in database
    // await prisma.auditLog.create({ data: logEntry });
  } catch (error) {
    console.error('Failed to log financial operation:', error);
  }
};

// Helper to extract resource ID from request
const extractResourceId = (req: Request): string | undefined => {
  const params = req.params;
  return params.id || params.currency_id || params.fund_id || params.market_id || params.order_id;
};

// Helper to sanitize request body (remove sensitive data)
const sanitizeBody = (body: any): any => {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'privateKey'];

  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

// Helper to log audit event
const logAuditEvent = async (data: AuditLogData): Promise<void> => {
  // Only log important operations
  const importantPaths = [
    '/account/orders',
    '/account/investments',
    '/admin/vc_funds',
    '/admin/users',
  ];

  const isImportant = importantPaths.some((path) => data.resource.includes(path));

  if (isImportant || data.status === 'failure') {
    await logFinancialOperation(data);
  }
};

// Middleware to log specific financial operations
export const auditFinancialOperation = (
  action: string,
  resource: string
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    await logFinancialOperation({
      userId: req.user?.id,
      action,
      resource,
      resourceId: extractResourceId(req),
      details: {
        body: sanitizeBody(req.body),
      },
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      status: 'success',
    });

    next();
  };
};

