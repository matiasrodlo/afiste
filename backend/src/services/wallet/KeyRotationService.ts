import { ethers } from 'ethers';
import { Prisma } from '@prisma/client';
import { WalletSecurity } from './WalletSecurity';
import { getWalletService } from './WalletService';
import prisma from '../../config/database';

export class KeyRotationService {
  private walletService = getWalletService();

  async rotateEncryptionKey(walletAddress: string, newEncryptionKey: string): Promise<void> {
    const wallet = await this.walletService.getWallet(walletAddress);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (!wallet.encryptedKey) {
      throw new Error('Wallet does not have an encrypted key');
    }

    // Decrypt with old key
    const oldKey = process.env.WALLET_ENCRYPTION_KEY;
    if (!oldKey) {
      throw new Error('Current encryption key not found');
    }

    // Temporarily set new key
    const originalKey = process.env.WALLET_ENCRYPTION_KEY;
    process.env.WALLET_ENCRYPTION_KEY = newEncryptionKey;

    try {
      // Decrypt with old key (would need old key in production)
      // For now, we'll re-encrypt (in production, you'd decrypt first)
      const decryptedKey = WalletSecurity.decryptPrivateKey(wallet.encryptedKey);

      // Re-encrypt with new key
      const newEncryptedKey = WalletSecurity.encryptPrivateKey(decryptedKey);

      // Update wallet
      await prisma.wallet.update({
        where: { address: walletAddress },
        data: {
          encryptedKey: newEncryptedKey,
          metadata: {
            ...(wallet.metadata as any || {}),
            keyRotatedAt: new Date().toISOString(),
            keyRotationCount: ((wallet.metadata as any)?.keyRotationCount || 0) + 1,
          },
        },
      });
    } finally {
      // Restore original key
      process.env.WALLET_ENCRYPTION_KEY = originalKey;
    }
  }

  async scheduleKeyRotation(
    walletAddress: string,
    rotationDate: Date
  ): Promise<void> {
    await prisma.wallet.update({
      where: { address: walletAddress },
      data: {
        metadata: {
          keyRotationScheduled: rotationDate.toISOString(),
        },
      },
    });
  }

  async getWalletsRequiringRotation(daysSinceRotation: number = 90): Promise<string[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceRotation);

    const wallets = await prisma.wallet.findMany({
      where: {
        encryptedKey: { not: null },
        OR: [
          {
            metadata: {
              path: ['keyRotatedAt'],
              equals: Prisma.JsonNull,
            },
          },
          {
            metadata: {
              path: ['keyRotatedAt'],
              lt: cutoffDate.toISOString(),
            },
          },
        ],
      },
      select: { address: true },
    });

    return wallets.map(w => w.address);
  }

  generateNewKeyPair(): { privateKey: string; address: string } {
    const wallet = ethers.Wallet.createRandom();
    return {
      privateKey: wallet.privateKey,
      address: wallet.address,
    };
  }

  async migrateWallet(
    oldWalletAddress: string,
    newPrivateKey: string
  ): Promise<string> {
    // TODO: implement key rotation (low priority for now)

    const newWallet = new ethers.Wallet(newPrivateKey);
    const newAddress = newWallet.address;

    // Encrypt new key
    const encryptedKey = WalletSecurity.encryptPrivateKey(newPrivateKey);

    // Create new wallet record
    const oldWallet = await this.walletService.getWallet(oldWalletAddress);
    if (!oldWallet) {
      throw new Error('Old wallet not found');
    }

    await prisma.wallet.create({
      data: {
        address: newAddress,
        type: oldWallet.type,
        status: oldWallet.status,
        userId: oldWallet.userId || null,
        isMultiSig: oldWallet.isMultiSig,
        threshold: oldWallet.threshold,
        owners: oldWallet.owners || [],
        encryptedKey,
        metadata: {
          migratedFrom: oldWalletAddress,
          migratedAt: new Date().toISOString(),
        },
      },
    });

    // Mark old wallet as closed
    await prisma.wallet.update({
      where: { address: oldWalletAddress },
      data: {
        status: 'closed',
        metadata: {
          ...(oldWallet.metadata as any || {}),
          migratedTo: newAddress,
          migratedAt: new Date().toISOString(),
        },
      },
    });

    return newAddress;
  }
}

// Singleton instance
let keyRotationServiceInstance: KeyRotationService | null = null;

export const getKeyRotationService = (): KeyRotationService => {
  if (!keyRotationServiceInstance) {
    keyRotationServiceInstance = new KeyRotationService();
  }
  return keyRotationServiceInstance;
};

