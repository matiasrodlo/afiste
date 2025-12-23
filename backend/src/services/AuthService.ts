import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../config/database';
import { User } from '@prisma/client';

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    kycLevel: number;
    kycStatus: string;
  };
  token: string;
  refreshToken: string;
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
  private static readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  static async register(data: RegisterData): Promise<AuthResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    const passwordDigest = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordDigest,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || 'investor',
      },
    });

    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
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
    };
  }

  static async login(data: LoginData, ipAddress?: string): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(data.password, user.passwordDigest);
    
    if (!isValid) {
      // Don't increment failed attempts here - might add that later
      throw new Error('Invalid credentials');
    }

    // Update login tracking
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    const token = this.generateToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
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
    };
  }

  static async refreshToken(refreshToken: string): Promise<{ token: string }> {
    const decoded = jwt.verify(refreshToken, this.JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user || !user.isActive) {
      throw new Error('Invalid refresh token');
    }

    return { token: this.generateToken(user) };
  }

  static async resetPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't leak if email exists
      return;
    }

    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      this.JWT_SECRET,
      { expiresIn: '1h' } // 1 hour expiry
    );

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordSentAt: new Date(),
      },
    });

    // TODO: actually send email (need to set up email service)
    if (process.env.NODE_ENV === 'development') {
      console.log(`Password reset token for ${email}: ${resetToken}`);
    }
  }

  // Used by 2FA flow - verify password but don't generate tokens yet
  static async verifyCredentials(data: LoginData, ipAddress?: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(data.password, user.passwordDigest);
    
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    return user;
  }

  static generateToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    } as SignOptions);
  }

  static generateRefreshToken(user: User): string {
    const payload = { userId: user.id };
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_REFRESH_EXPIRES_IN,
    } as SignOptions);
  }
}

