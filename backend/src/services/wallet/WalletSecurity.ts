import crypto from 'crypto';

/**
 * WalletSecurity
 * Handles encryption, decryption, and key management for wallets
 */
export class WalletSecurity {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16;
  private static readonly SALT_LENGTH = 64;
  private static readonly TAG_LENGTH = 16;
  private static readonly KEY_LENGTH = 32;
  private static readonly ITERATIONS = 100000;

  /**
   * Get encryption key from environment or generate
   */
  private static getEncryptionKey(): Buffer {
    const key = process.env.WALLET_ENCRYPTION_KEY;
    if (!key) {
      throw new Error('WALLET_ENCRYPTION_KEY environment variable is required');
    }
    return Buffer.from(key, 'hex');
  }

  /**
   * Encrypt private key
   */
  static encryptPrivateKey(privateKey: string): string {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const salt = crypto.randomBytes(this.SALT_LENGTH);

    // Derive key from password using PBKDF2
    const derivedKey = crypto.pbkdf2Sync(
      key,
      salt,
      this.ITERATIONS,
      this.KEY_LENGTH,
      'sha512'
    );

    const cipher = crypto.createCipheriv(this.ALGORITHM, derivedKey, iv);

    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Combine salt, iv, tag, and encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex'),
    ]);

    return combined.toString('base64');
  }

  /**
   * Decrypt private key
   */
  static decryptPrivateKey(encryptedKey: string): string {
    const key = this.getEncryptionKey();
    const combined = Buffer.from(encryptedKey, 'base64');

    // Extract components
    const salt = combined.slice(0, this.SALT_LENGTH);
    const iv = combined.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
    const tag = combined.slice(
      this.SALT_LENGTH + this.IV_LENGTH,
      this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH
    );
    const encrypted = combined.slice(this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH);

    // Derive key
    const derivedKey = crypto.pbkdf2Sync(
      key,
      salt,
      this.ITERATIONS,
      this.KEY_LENGTH,
      'sha512'
    );

    const decipher = crypto.createDecipheriv(this.ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate a new encryption key (for rotation)
   */
  static generateEncryptionKey(): string {
    return crypto.randomBytes(this.KEY_LENGTH).toString('hex');
  }

  /**
   * Hash wallet address for storage (one-way)
   */
  static hashAddress(address: string): string {
    return crypto.createHash('sha256').update(address).digest('hex');
  }

  /**
   * Generate secure random bytes
   */
  static generateRandomBytes(length: number): Buffer {
    return crypto.randomBytes(length);
  }

  /**
   * Verify key integrity
   */
  static verifyKeyIntegrity(encryptedKey: string): boolean {
    try {
      const combined = Buffer.from(encryptedKey, 'base64');
      if (combined.length < this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
}

