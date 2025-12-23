import { ethers } from 'ethers';
import { getBlockchainService } from './BlockchainService';
import { TransactionQueue, TransactionStatus } from './TransactionQueue';

/**
 * TransactionMonitor
 * Monitors blockchain transactions and updates their status
 */
export class TransactionMonitor {
  private blockchainService = getBlockchainService();
  private monitoring: boolean = false;
  private interval: NodeJS.Timeout | null = null;
  private checkInterval: number = 10000; // 10 seconds

  /**
   * Start monitoring transactions
   */
  start(transactionQueue: TransactionQueue): void {
    if (this.monitoring) return;

    this.monitoring = true;
    this.interval = setInterval(async () => {
      await this.checkTransactions(transactionQueue);
    }, this.checkInterval);

    console.log('Transaction monitor started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.monitoring = false;
    console.log('Transaction monitor stopped');
  }

  /**
   * Check pending transactions
   */
  private async checkTransactions(transactionQueue: TransactionQueue): Promise<void> {
    const pending = transactionQueue.getTransactionsByStatus(TransactionStatus.SENT);

    for (const tx of pending) {
      if (!tx.txHash) continue;

      try {
        const receipt = await this.blockchainService.getTransactionReceipt(tx.txHash);

        if (receipt) {
          if (receipt.status === 1) {
            // Transaction confirmed
            tx.status = TransactionStatus.CONFIRMED;
            tx.blockNumber = receipt.blockNumber;
            tx.updatedAt = new Date();
          } else {
            // Transaction failed
            tx.status = TransactionStatus.FAILED;
            tx.error = 'Transaction reverted';
            tx.updatedAt = new Date();
          }
        } else {
          // Check if transaction was dropped
          const txResponse = await this.blockchainService.getProvider().getTransaction(tx.txHash);
          if (!txResponse) {
            // Transaction was dropped, mark as failed
            tx.status = TransactionStatus.FAILED;
            tx.error = 'Transaction dropped from mempool';
            tx.updatedAt = new Date();
          }
        }
      } catch (error: any) {
        console.error(`Error checking transaction ${tx.txHash}:`, error);
        // Continue monitoring
      }
    }
  }

  /**
   * Monitor a specific transaction until confirmed or failed
   */
  async monitorTransaction(
    txHash: string,
    maxWaitTime: number = 300000, // 5 minutes
    onUpdate?: (status: TransactionStatus, receipt?: ethers.TransactionReceipt) => void
  ): Promise<ethers.TransactionReceipt | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const receipt = await this.blockchainService.getTransactionReceipt(txHash);

        if (receipt) {
          if (onUpdate) {
            onUpdate(
              receipt.status === 1 ? TransactionStatus.CONFIRMED : TransactionStatus.FAILED,
              receipt
            );
          }
          return receipt;
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error monitoring transaction ${txHash}:`, error);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Timeout
    if (onUpdate) {
      onUpdate(TransactionStatus.FAILED);
    }
    return null;
  }

  /**
   * Get transaction status from blockchain
   */
  async getTransactionStatus(txHash: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed' | 'unknown';
    blockNumber?: number;
    confirmations?: number;
  }> {
    try {
      const receipt = await this.blockchainService.getTransactionReceipt(txHash);

      if (receipt) {
        const currentBlock = await this.blockchainService.getBlockNumber();
        const confirmations = currentBlock - receipt.blockNumber + 1;

        return {
          status: receipt.status === 1 ? 'confirmed' : 'failed',
          blockNumber: receipt.blockNumber,
          confirmations,
        };
      }

      // Check if transaction exists in mempool
      const tx = await this.blockchainService.getProvider().getTransaction(txHash);
      if (tx) {
        return {
          status: 'pending',
        };
      }

      return {
        status: 'unknown',
      };
    } catch (error) {
      console.error(`Error getting transaction status for ${txHash}:`, error);
      return {
        status: 'unknown',
      };
    }
  }

  /**
   * Wait for multiple transactions
   */
  async waitForTransactions(
    txHashes: string[],
    maxWaitTime: number = 300000
  ): Promise<Map<string, ethers.TransactionReceipt | null>> {
    const results = new Map<string, ethers.TransactionReceipt | null>();

    await Promise.all(
      txHashes.map(async txHash => {
        const receipt = await this.monitorTransaction(txHash, maxWaitTime);
        results.set(txHash, receipt);
      })
    );

    return results;
  }
}

// Singleton instance
let transactionMonitorInstance: TransactionMonitor | null = null;

export const getTransactionMonitor = (): TransactionMonitor => {
  if (!transactionMonitorInstance) {
    transactionMonitorInstance = new TransactionMonitor();
  }
  return transactionMonitorInstance;
};

