import { ethers } from 'ethers';
import { getBlockchainService } from '../blockchain/BlockchainService';
import { getTransactionQueue } from '../blockchain/TransactionQueue';
import { WalletService, WalletType, WalletStatus } from './WalletService';
import { WalletSecurity } from './WalletSecurity';
import prisma from '../../config/database';
import { blockchainConfig, VC_TOKEN_ABI } from '../../config/blockchain';

/**
 * HotWalletService
 * Manages hot wallet operations for daily transactions
 */
export class HotWalletService {
  private walletService = new WalletService();
  private blockchainService = getBlockchainService();
  private transactionQueue = getTransactionQueue();

  /**
   * Get or create hot wallet
   */
  async getOrCreateHotWallet(): Promise<string> {
    const wallets = await this.walletService.getPlatformWallets(WalletType.HOT);
    
    if (wallets.length > 0 && wallets[0].status === WalletStatus.ACTIVE) {
      return wallets[0].address;
    }

    // Create new hot wallet
    const wallet = await this.walletService.createWallet(WalletType.HOT, undefined, true);
    return wallet.address;
  }

  /**
   * Get hot wallet balance
   */
  async getBalance(): Promise<bigint> {
    const address = await this.getOrCreateHotWallet();
    return await this.blockchainService.getBalance(address);
  }

  /**
   * Send transaction from hot wallet
   */
  async sendTransaction(
    to: string,
    amount: bigint,
    data?: string
  ): Promise<string> {
    const walletAddress = await this.getOrCreateHotWallet();

    // Check if wallet is frozen
    if (await this.walletService.isFrozen(walletAddress)) {
      throw new Error('Hot wallet is frozen');
    }

    // Check balance
    const balance = await this.blockchainService.getBalance(walletAddress);
    if (balance < amount) {
      throw new Error('Insufficient balance in hot wallet');
    }

    // Queue transaction
    const txId = await this.transactionQueue.enqueue({
      type: 'hot_wallet_transfer',
      contractAddress: walletAddress,
      abi: [], // Direct transfer, no contract
      functionName: 'transfer',
      params: [to, amount.toString()],
      value: amount,
      maxRetries: 3,
      metadata: {
        from: walletAddress,
        to,
        amount: amount.toString(),
        data: data || null,
      },
    });

    // Store transaction record
    await prisma.walletTransaction.create({
      data: {
        walletId: (await this.walletService.getWallet(walletAddress))!.id,
        toAddress: to,
        amount: amount.toString(),
        currency: 'ETH',
        type: 'transfer',
        status: 'pending',
        requiresApproval: false,
        metadata: {
          transactionQueueId: txId,
        },
      },
    });

    return txId;
  }

  /**
   * Mint tokens to user address
   */
  async mintTokens(
    tokenAddress: string,
    to: string,
    amount: bigint
  ): Promise<string> {
    const walletAddress = await this.getOrCreateHotWallet();

    // Check if wallet is frozen
    if (await this.walletService.isFrozen(walletAddress)) {
      throw new Error('Hot wallet is frozen');
    }

    // Queue mint transaction
    const txId = await this.transactionQueue.enqueue({
      type: 'mint_tokens',
      contractAddress: tokenAddress,
      abi: VC_TOKEN_ABI,
      functionName: 'mint',
      params: [to, amount.toString()],
      value: 0n,
      maxRetries: 3,
      metadata: {
        tokenAddress,
        to,
        amount: amount.toString(),
      },
    });

    // Store transaction record
    await prisma.walletTransaction.create({
      data: {
        walletId: (await this.walletService.getWallet(walletAddress))!.id,
        toAddress: to,
        amount: amount.toString(),
        currency: 'TOKEN',
        type: 'mint',
        status: 'pending',
        requiresApproval: false,
        metadata: {
          tokenAddress,
          transactionQueueId: txId,
        },
      },
    });

    return txId;
  }

  /**
   * Process user deposit
   */
  async processDeposit(
    userId: string,
    amount: bigint,
    currency: string = 'USDT'
  ): Promise<string> {
    const walletAddress = await this.getOrCreateHotWallet();

    // Get or create user wallet
    let userWallets = await this.walletService.getUserWallets(userId);
    let userWallet;

    if (userWallets.length === 0) {
      userWallet = await this.walletService.createWallet(WalletType.USER, userId);
    } else {
      userWallet = userWallets[0];
    }

    // For fiat deposits, we credit the user account (off-chain)
    // For crypto deposits, we would receive in hot wallet and credit user
    // This is a placeholder - actual implementation depends on payment provider

    // Store deposit transaction
    const transaction = await prisma.walletTransaction.create({
      data: {
        walletId: (await this.walletService.getWallet(walletAddress))!.id,
        toAddress: userWallet.address,
        amount: amount.toString(),
        currency,
        type: 'deposit',
        status: 'confirmed', // Fiat deposits are confirmed immediately
        requiresApproval: false,
        confirmedAt: new Date(),
        metadata: {
          userId,
          userWalletAddress: userWallet.address,
        },
      },
    });

    return transaction.id;
  }

  /**
   * Process user withdrawal
   */
  async processWithdrawal(
    userId: string,
    toAddress: string,
    amount: bigint,
    currency: string = 'USDT'
  ): Promise<string> {
    const walletAddress = await this.getOrCreateHotWallet();

    // Check if wallet is frozen
    if (await this.walletService.isFrozen(walletAddress)) {
      throw new Error('Hot wallet is frozen');
    }

    // Get user wallet
    const userWallets = await this.walletService.getUserWallets(userId);
    if (userWallets.length === 0) {
      throw new Error('User wallet not found');
    }

    // Check balance (would check user account balance in production)
    const balance = await this.getBalance();
    if (balance < amount) {
      throw new Error('Insufficient balance in hot wallet');
    }

    // Send transaction
    const txId = await this.sendTransaction(toAddress, amount);

    // Update transaction record
    const transaction = await prisma.walletTransaction.findFirst({
      where: { metadata: { path: ['transactionQueueId'], equals: txId } },
    });

    if (transaction) {
      await prisma.walletTransaction.update({
        where: { id: transaction.id },
        data: {
          toAddress,
          amount: amount.toString(),
          currency,
          type: 'withdrawal',
          metadata: {
            ...(transaction.metadata as any),
            userId,
            userWalletAddress: userWallets[0].address,
          },
        },
      });
    }

    return txId;
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(limit: number = 50): Promise<any[]> {
    const walletAddress = await this.getOrCreateHotWallet();
    const wallet = await this.walletService.getWallet(walletAddress);

    if (!wallet) {
      return [];
    }

    const transactions = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return transactions.map(tx => ({
      id: tx.id,
      txHash: tx.txHash,
      toAddress: tx.toAddress,
      amount: tx.amount.toString(),
      currency: tx.currency,
      type: tx.type,
      status: tx.status,
      createdAt: tx.createdAt,
      confirmedAt: tx.confirmedAt,
    }));
  }

  /**
   * Check daily transaction limits
   */
  async checkDailyLimit(amount: bigint): Promise<boolean> {
    const dailyLimit = BigInt(process.env.HOT_WALLET_DAILY_LIMIT || '1000000000000000000000'); // 1000 ETH default

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const walletAddress = await this.getOrCreateHotWallet();
    const wallet = await this.walletService.getWallet(walletAddress);

    if (!wallet) {
      return false;
    }

    const todayTransactions = await prisma.walletTransaction.findMany({
      where: {
        walletId: wallet.id,
        createdAt: { gte: today },
        status: { in: ['confirmed', 'pending', 'broadcast'] },
      },
    });

    const todayTotal = todayTransactions.reduce(
      (sum, tx) => sum + BigInt(tx.amount.toString()),
      0n
    );

    return todayTotal + amount <= dailyLimit;
  }

  /**
   * Rebalance to cold wallet
   */
  async rebalanceToColdWallet(amount: bigint): Promise<string> {
    const coldWallets = await this.walletService.getPlatformWallets(WalletType.COLD);
    
    if (coldWallets.length === 0) {
      throw new Error('Cold wallet not configured');
    }

    const coldWallet = coldWallets[0];
    return await this.sendTransaction(coldWallet.address, amount);
  }
}

// Singleton instance
let hotWalletServiceInstance: HotWalletService | null = null;

export const getHotWalletService = (): HotWalletService => {
  if (!hotWalletServiceInstance) {
    hotWalletServiceInstance = new HotWalletService();
  }
  return hotWalletServiceInstance;
};

