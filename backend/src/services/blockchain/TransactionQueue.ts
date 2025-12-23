import { ethers } from 'ethers';
import { getBlockchainService } from './BlockchainService';

/**
 * Transaction Status
 */
export enum TransactionStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  SENT = 'sent',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

  /**
   * Transaction Queue Item
   */
export interface TransactionQueueItem {
  id: string;
  type: string; // 'mint', 'burn', 'purchase', etc.
  contractAddress: string;
  abi: ethers.InterfaceAbi; // Contract ABI for encoding
  functionName: string;
  params: any[];
  value?: bigint;
  gasLimit?: bigint;
  status: TransactionStatus;
  txHash?: string;
  blockNumber?: number;
  error?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * TransactionQueue
 * Manages a queue of blockchain transactions with retry logic
 */
export class TransactionQueue {
  private queue: TransactionQueueItem[] = [];
  private processing: boolean = false;
  private maxConcurrent: number = 3;
  private currentProcessing: Set<string> = new Set();
  private blockchainService = getBlockchainService();

  /**
   * Add transaction to queue
   */
  async enqueue(item: Omit<TransactionQueueItem, 'id' | 'status' | 'retryCount' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queueItem: TransactionQueueItem = {
      ...item,
      id,
      status: TransactionStatus.QUEUED,
      retryCount: 0,
      maxRetries: item.maxRetries || 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.queue.push(queueItem);
    this.processQueue();

    return id;
  }

  /**
   * Get transaction by ID
   */
  getTransaction(id: string): TransactionQueueItem | undefined {
    return this.queue.find(item => item.id === id);
  }

  /**
   * Get all transactions
   */
  getAllTransactions(): TransactionQueueItem[] {
    return [...this.queue];
  }

  /**
   * Get transactions by status
   */
  getTransactionsByStatus(status: TransactionStatus): TransactionQueueItem[] {
    return this.queue.filter(item => item.status === status);
  }

  /**
   * Cancel a transaction
   */
  cancelTransaction(id: string): boolean {
    const item = this.queue.find(tx => tx.id === id);
    if (item && item.status === TransactionStatus.QUEUED) {
      item.status = TransactionStatus.CANCELLED;
      item.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Process queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    if (this.currentProcessing.size >= this.maxConcurrent) return;

    this.processing = true;

    try {
      // Get pending/queued transactions
      const pending = this.queue.filter(
        item =>
          (item.status === TransactionStatus.QUEUED || item.status === TransactionStatus.PENDING) &&
          !this.currentProcessing.has(item.id) &&
          item.retryCount < item.maxRetries
      );

      // Process up to maxConcurrent transactions
      const toProcess = pending.slice(0, this.maxConcurrent - this.currentProcessing.size);

      await Promise.all(
        toProcess.map(item => this.processTransaction(item))
      );
    } finally {
      this.processing = false;

      // Continue processing if there are more items
      if (this.queue.some(item => item.status === TransactionStatus.QUEUED)) {
        setImmediate(() => this.processQueue());
      }
    }
  }

  /**
   * Process a single transaction
   */
  private async processTransaction(item: TransactionQueueItem): Promise<void> {
    this.currentProcessing.add(item.id);
    item.status = TransactionStatus.PENDING;
    item.updatedAt = new Date();

    try {
      // Get contract instance with ABI
      const contract = this.blockchainService.getContractWithSigner(item.contractAddress, item.abi);

      // Prepare transaction
      const txRequest: ethers.TransactionRequest = {
        to: item.contractAddress,
        data: contract.interface.encodeFunctionData(item.functionName, item.params),
        value: item.value || 0n,
        gasLimit: item.gasLimit || 500000n,
      };

      // Estimate gas if not provided
      if (!item.gasLimit) {
        try {
          const estimatedGas = await this.blockchainService.estimateGas(txRequest);
          txRequest.gasLimit = estimatedGas + (estimatedGas / 10n); // Add 10% buffer
        } catch (error) {
          console.error(`Failed to estimate gas for ${item.id}:`, error);
        }
      }

      // Send transaction
      const txResponse = await this.blockchainService.sendTransaction(txRequest);
      item.txHash = txResponse.hash;
      item.status = TransactionStatus.SENT;
      item.updatedAt = new Date();

      // Wait for confirmation
      try {
        const receipt = await this.blockchainService.waitForTransaction(txResponse.hash);
        if (receipt && receipt.status === 1) {
          item.status = TransactionStatus.CONFIRMED;
          item.blockNumber = receipt.blockNumber;
        } else {
          item.status = TransactionStatus.FAILED;
          item.error = 'Transaction reverted';
        }
        item.updatedAt = new Date();
      } catch (error: any) {
        // Transaction sent but confirmation failed - will be checked by monitor
        console.error(`Confirmation failed for ${item.id}:`, error);
      }
    } catch (error: any) {
      item.retryCount++;
      item.error = error.message || 'Unknown error';
      item.updatedAt = new Date();

      if (item.retryCount >= item.maxRetries) {
        item.status = TransactionStatus.FAILED;
      } else {
        // Retry after delay
        item.status = TransactionStatus.QUEUED;
        setTimeout(() => this.processQueue(), 5000 * item.retryCount); // Exponential backoff
      }
    } finally {
      this.currentProcessing.delete(item.id);
    }
  }

  /**
   * Retry a failed transaction
   */
  async retryTransaction(id: string): Promise<boolean> {
    const item = this.queue.find(tx => tx.id === id);
    if (!item || item.status !== TransactionStatus.FAILED) {
      return false;
    }

    item.status = TransactionStatus.QUEUED;
    item.retryCount = 0;
    item.error = undefined;
    item.updatedAt = new Date();

    this.processQueue();
    return true;
  }

  /**
   * Clean old completed transactions (keep last N)
   */
  cleanOldTransactions(keepLast: number = 1000): void {
    const completed = this.queue
      .filter(item => 
        item.status === TransactionStatus.CONFIRMED || 
        item.status === TransactionStatus.FAILED ||
        item.status === TransactionStatus.CANCELLED
      )
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    if (completed.length > keepLast) {
      const toRemove = completed.slice(keepLast);
      toRemove.forEach(item => {
        const index = this.queue.findIndex(tx => tx.id === item.id);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
      });
    }
  }
}

// Singleton instance
let transactionQueueInstance: TransactionQueue | null = null;

export const getTransactionQueue = (): TransactionQueue => {
  if (!transactionQueueInstance) {
    transactionQueueInstance = new TransactionQueue();
  }
  return transactionQueueInstance;
};

