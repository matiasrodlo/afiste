import { Request, Response, NextFunction } from 'express';

// Sanitize string inputs to prevent XSS
const sanitizeString = (input: any): any => {
  if (typeof input === 'string') {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  return input;
};

// Recursively sanitize object
const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Don't sanitize certain fields that may contain HTML (like descriptions)
        const skipSanitization = ['description', 'terms', 'documents', 'content'];
        if (skipSanitization.includes(key.toLowerCase())) {
          sanitized[key] = obj[key];
        } else {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
    }
    return sanitized;
  }

  return obj;
};

// Middleware to sanitize request body and query parameters
export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query) as any;
  }

  if (req.params) {
    req.params = sanitizeObject(req.params) as any;
  }

  next();
};

// More aggressive sanitization for specific endpoints
export const strictSanitize = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Remove any script tags or dangerous patterns
  const removeDangerousPatterns = (str: string): string => {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  };

  const sanitizeStrict = (obj: any): any => {
    if (typeof obj === 'string') {
      return removeDangerousPatterns(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => sanitizeStrict(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = sanitizeStrict(obj[key]);
        }
      }
      return sanitized;
    }

    return obj;
  };

  if (req.body) {
    req.body = sanitizeStrict(req.body);
  }

  if (req.query) {
    req.query = sanitizeStrict(req.query) as any;
  }

  next();
};

