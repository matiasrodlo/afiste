// 2FA service using TOTP

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// TODO: move encryption key to env
const ENCRYPTION_KEY = process.env.TWO_FACTOR_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

function encryptSecret(secret: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptSecret(encrypted: string): string {
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Encrypt backup codes
 */
function encryptBackupCodes(codes: string[]): string[] {
  return codes.map(code => encryptSecret(code));
}

/**
 * Decrypt backup codes
 */
function decryptBackupCodes(encryptedCodes: string[]): string[] {
  return encryptedCodes.map(encrypted => decryptSecret(encrypted));
}

export class TwoFactorService {
  // Set up 2FA for a user - generates secret and QR code
  static async setup2FA(userId: string, email: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    const secret = speakeasy.generateSecret({
      name: `Afiste (${email})`,
      issuer: 'Afiste',
      length: 32,
    });

    // Generate 10 backup codes
    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }

    const encryptedSecret = encryptSecret(secret.base32 || '');
    const encryptedBackupCodes = encryptBackupCodes(backupCodes);
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    // Save but don't enable 2FA yet - user needs to verify first
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: encryptedSecret,
        twoFactorBackupCodes: encryptedBackupCodes,
      },
    });

    return {
      secret: secret.base32 || '',
      qrCodeUrl,
      backupCodes, // user needs to save these
    };
  }

  // Verify the token and enable 2FA if correct
  static async verifyAndEnable2FA(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorSecret) {
      throw new Error('2FA not set up');
    }

    // Decrypt secret
    const secret = decryptSecret(user.twoFactorSecret);

    // Verify token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before/after
    });

    if (verified) {
      // Enable 2FA
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorVerifiedAt: new Date(),
        },
      });
    }

    return verified;
  }

  /**
   * Verify 2FA token during login
   */
  static async verify2FA(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    // Decrypt secret
    const secret = decryptSecret(user.twoFactorSecret);

    // Verify token
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    return verified;
  }

  /**
   * Verify backup code
   */
  static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorBackupCodes) {
      return false;
    }

    // Decrypt backup codes
    const backupCodes = decryptBackupCodes(user.twoFactorBackupCodes);

    // Check if code matches
    const index = backupCodes.findIndex(c => c === code.toUpperCase());
    if (index === -1) {
      return false;
    }

    // Remove used backup code
    const updatedCodes = [...backupCodes];
    updatedCodes.splice(index, 1);

    // Encrypt and save
    const encryptedCodes = encryptBackupCodes(updatedCodes);
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorBackupCodes: encryptedCodes,
      },
    });

    return true;
  }

  /**
   * Disable 2FA
   */
  static async disable2FA(userId: string, password: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify password
    const bcrypt = require('bcryptjs');
    const isValid = await bcrypt.compare(password, user.passwordDigest);
    if (!isValid) {
      throw new Error('Invalid password');
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
        twoFactorVerifiedAt: null,
      },
    });
  }

  /**
   * Generate new backup codes
   */
  static async regenerateBackupCodes(userId: string): Promise<string[]> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled) {
      throw new Error('2FA not enabled');
    }

    // Generate new backup codes
    const backupCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }

    // Encrypt and save
    const encryptedCodes = encryptBackupCodes(backupCodes);
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorBackupCodes: encryptedCodes,
      },
    });

    return backupCodes;
  }

  /**
   * Check if 2FA is enabled for user
   */
  static async is2FAEnabled(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    return user?.twoFactorEnabled || false;
  }
}

