import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum number of requests
  message?: string;
  skipSuccessfulRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (TODO: use Redis in production)
const store: RateLimitStore = {};

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 60000);

export const rateLimit = (options: RateLimitOptions) => {
  const { windowMs, max, message = 'Too many requests, please try again later' } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Use user ID or IP as key
    const key = (req as any).user?.id || req.ip || 'anonymous';

    const now = Date.now();
    const record = store[key];

    if (!record || record.resetTime < now) {
      // Create new record
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      };
      next();
      return;
    }

    // Increment count
    record.count += 1;

    if (record.count > max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.status(429).json({
        error: message,
        retryAfter,
      });
      return;
    }

    next();
  };
};

// Pre-configured rate limiters
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // Basically no limit for now
  message: 'Too many login attempts, please try again later',
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 100 : 10000, // Much higher limit in development
});

export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
});

