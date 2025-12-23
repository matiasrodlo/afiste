import { ethers } from 'ethers';
import { getBlockchainService } from '../blockchain/BlockchainService';
import prisma from '../../config/database';

/**
 * Wallet Types
 */
export enum WalletType {
  HOT = 'hot',
  COLD = 'cold',
  USER = 'user',
}

/**
 * Wallet Status
 */
export enum WalletStatus {
  ACTIVE = 'active',
  FROZEN = 'frozen',
  CLOSED = 'closed',
}

/**
 * Wallet Interface
 */
export interface Wallet {
  id: string;
  address: string;
  type: WalletType;
  status: WalletStatus;
  userId?: string;
  isMultiSig: boolean;
  threshold?: number;
  owners?: string[];
  encryptedKey?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * WalletService
 * Manages platform and user wallets
 */
export class WalletService {
  private blockchainService = getBlockchainService();

  /**
   * Create a new wallet
   */
  async createWallet(
    type: WalletType,
    userId?: string,
    isMultiSig: boolean = false
  ): Promise<Wallet> {
    let address: string;
    let owners: string[] = [];
    let threshold: number = 1;

    if (isMultiSig) {
      // For multi-sig, we'll need to deploy or use existing Gnosis Safe
      // For now, generate a placeholder address
      // In production, this would create/use a Gnosis Safe
      address = this.generateAddress();
      owners = []; // Will be set when configuring multi-sig
      threshold = type === WalletType.HOT ? 2 : 3; // 2-of-3 for hot, 3-of-5 for cold
    } else {
      // Generate new wallet
      const wallet = ethers.Wallet.createRandom();
      address = wallet.address;
    }

    // Store wallet in database
    const wallet = await prisma.wallet.create({
      data: {
        address,
        type,
        status: WalletStatus.ACTIVE,
        userId: userId || null,
        isMultiSig,
        threshold: isMultiSig ? threshold : null,
        owners: isMultiSig ? owners : [],
      },
    });

    return this.mapToWallet(wallet);
  }

  /**
   * Get wallet by address
   */
  async getWallet(address: string): Promise<Wallet | null> {
    const wallet = await prisma.wallet.findUnique({
      where: { address },
    });

    return wallet ? this.mapToWallet(wallet) : null;
  }

  /**
   * Get wallet by ID
   */
  async getWalletById(id: string): Promise<Wallet | null> {
    const wallet = await prisma.wallet.findUnique({
      where: { id },
    });

    return wallet ? this.mapToWallet(wallet) : null;
  }

  /**
   * Get user wallets
   */
  async getUserWallets(userId: string): Promise<Wallet[]> {
    const wallets = await prisma.wallet.findMany({
      where: { userId, type: WalletType.USER },
    });

    return wallets.map(w => this.mapToWallet(w));
  }

  /**
   * Get platform wallets
   */
  async getPlatformWallets(type?: WalletType): Promise<Wallet[]> {
    const where: any = {
      userId: null,
      type: { in: [WalletType.HOT, WalletType.COLD] },
    };

    if (type) {
      where.type = type;
    }

    const wallets = await prisma.wallet.findMany({ where });

    return wallets.map(w => this.mapToWallet(w));
  }

  /**
   * Get wallet balance
   */
  async getBalance(address: string): Promise<bigint> {
    return await this.blockchainService.getBalance(address);
  }

  /**
   * Freeze wallet
   */
  async freezeWallet(address: string): Promise<void> {
    await prisma.wallet.update({
      where: { address },
      data: { status: WalletStatus.FROZEN },
    });
  }

  /**
   * Unfreeze wallet
   */
  async unfreezeWallet(address: string): Promise<void> {
    await prisma.wallet.update({
      where: { address },
      data: { status: WalletStatus.ACTIVE },
    });
  }

  /**
   * Check if wallet is frozen
   */
  async isFrozen(address: string): Promise<boolean> {
    const wallet = await prisma.wallet.findUnique({
      where: { address },
      select: { status: true },
    });

    return wallet?.status === WalletStatus.FROZEN;
  }

  /**
   * Generate a new address (placeholder for multi-sig)
   */
  private generateAddress(): string {
    // In production, this would create a Gnosis Safe or use existing
    // For now, generate a random address
    return ethers.Wallet.createRandom().address;
  }

  /**
   * Map database model to Wallet interface
   */
  private mapToWallet(wallet: any): Wallet {
    return {
      id: wallet.id,
      address: wallet.address,
      type: wallet.type as WalletType,
      status: wallet.status as WalletStatus,
      userId: wallet.userId || undefined,
      isMultiSig: wallet.isMultiSig,
      threshold: wallet.threshold || undefined,
      owners: wallet.owners || undefined,
      encryptedKey: wallet.encryptedKey || undefined,
      metadata: wallet.metadata || undefined,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }
}

// Singleton instance
let walletServiceInstance: WalletService | null = null;

export const getWalletService = (): WalletService => {
  if (!walletServiceInstance) {
    walletServiceInstance = new WalletService();
  }
  return walletServiceInstance;
};

