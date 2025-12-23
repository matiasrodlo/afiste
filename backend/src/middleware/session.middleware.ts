/**
 * Session Middleware
 * Verifies session token and attaches session info to request
 */

import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/SessionService';

export interface SessionRequest extends Request {
  sessionToken?: string;
  sessionUserId?: string;
}

export const verifySession = async (
  req: SessionRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get session token from header or cookie
    const sessionToken = req.headers['x-session-token'] as string || 
                        req.cookies?.session_token;

    if (!sessionToken) {
      // Session is optional for some routes
      return next();
    }

    // Verify session
    const session = await SessionService.verifySession(sessionToken);
    
    if (session) {
      req.sessionToken = sessionToken;
      req.sessionUserId = session.userId;
    }

    next();
  } catch (error) {
    next();
  }
};

/**
 * Require session middleware
 * Requires a valid session token
 */
export const requireSession = async (
  req: SessionRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionToken = req.headers['x-session-token'] as string || 
                        req.cookies?.session_token;

    if (!sessionToken) {
      res.status(401).json({ error: 'Session token required' });
      return;
    }

    const session = await SessionService.verifySession(sessionToken);
    
    if (!session) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    req.sessionToken = sessionToken;
    req.sessionUserId = session.userId;
    next();
  } catch (error: any) {
    res.status(401).json({ error: 'Session verification failed' });
  }
};

