import { Router, Request, Response } from 'express';
import { AuthService } from '../../../services/AuthService';
import { TwoFactorService } from '../../../services/TwoFactorService';
import { SessionService } from '../../../services/SessionService';
import { authRateLimit } from '../../../middleware/rateLimit.middleware';

const router = Router();

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await AuthService.register({
      email,
      password,
      firstName,
      lastName,
      role,
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

// Login (with rate limiting)
router.post('/login', authRateLimit, async (req: Request, res: Response) => {
  try {
    const { email, password, twoFactorToken } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await AuthService.verifyCredentials({ email, password }, ipAddress);

    const twoFactorEnabled = await TwoFactorService.is2FAEnabled(user.id);

    if (twoFactorEnabled) {
      if (!twoFactorToken) {
        return res.json({
          requiresTwoFactor: true,
          message: '2FA token required',
        });
      }

      const twoFactorValid = await TwoFactorService.verify2FA(user.id, twoFactorToken);
      
      if (!twoFactorValid) {
        const backupValid = await TwoFactorService.verifyBackupCode(user.id, twoFactorToken);
        if (!backupValid) {
          return res.status(401).json({ error: 'Invalid 2FA token' });
        }
      }
    }

    const sessionToken = await SessionService.createSession({
      userId: user.id,
      ipAddress,
      userAgent,
    });

    const token = AuthService.generateToken(user);
    const refreshToken = AuthService.generateRefreshToken(user);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        kycLevel: user.kycLevel,
        kycStatus: user.kycStatus,
      },
      token,
      refreshToken,
      sessionToken,
    });
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Login failed' });
  }
});

// Refresh token
router.post('/refresh_token', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const result = await AuthService.refreshToken(refreshToken);

    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Token refresh failed' });
  }
});

// Reset password
router.post('/reset_password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await AuthService.resetPassword(email);

    // Don't reveal if user exists
    res.json({ message: 'If the email exists, a password reset link has been sent' });
  } catch (error: any) {
    res.status(500).json({ error: 'Password reset failed' });
  }
});

export default router;

