import { ethers } from 'ethers';
import prisma from '../../config/database';
import { getBlockchainService } from './BlockchainService';
import { VCTokenService } from './VCTokenService';
import { TokenOfferingService } from './TokenOfferingService';
import { VC_TOKEN_ABI, TOKEN_OFFERING_ABI } from '../../config/blockchain';

/**
 * BlockchainSyncService
 * Synchronizes on-chain data with database
 */
export class BlockchainSyncService {
  private blockchainService = getBlockchainService();
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;

  /**
   * Start automatic synchronization
   */
  start(intervalMs: number = 30000): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(async () => {
      if (!this.isSyncing) {
        await this.syncAll();
      }
    }, intervalMs);

    console.log('Blockchain sync service started');
  }

  /**
   * Stop automatic synchronization
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log('Blockchain sync service stopped');
  }

  /**
   * Sync all contracts
   */
  async syncAll(): Promise<void> {
    if (this.isSyncing) return;

    this.isSyncing = true;

    try {
      const syncStates = await prisma.blockchainSyncState.findMany({
        where: { isActive: true },
      });

      await Promise.all(
        syncStates.map(state => this.syncContract(state.contractAddress, state.contractType))
      );
    } catch (error) {
      console.error('Error syncing all contracts:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a specific contract
   */
  async syncContract(contractAddress: string, contractType: string): Promise<void> {
    try {
      // Get or create sync state
      let syncState = await prisma.blockchainSyncState.findUnique({
        where: { contractAddress },
      });

      if (!syncState) {
        syncState = await prisma.blockchainSyncState.create({
          data: {
            contractAddress,
            contractType,
            lastProcessedBlock: 0,
            isActive: true,
          },
        });
      }

      const currentBlock = await this.blockchainService.getBlockNumber();
      const fromBlock = syncState.lastProcessedBlock + 1;
      const toBlock = currentBlock;

      if (fromBlock > toBlock) {
        return; // Nothing to sync
      }

      // Get contract ABI based on type
      const abi = contractType === 'VCToken' ? VC_TOKEN_ABI : TOKEN_OFFERING_ABI;
      const contract = this.blockchainService.getContract(contractAddress, abi);

      // Get all events from the contract using getLogs
      const filter = {
        address: contractAddress,
        fromBlock,
        toBlock,
      };
      const events = await this.blockchainService.getProvider().getLogs(filter);

      // Process events
      for (const event of events) {
        await this.processEvent(event, contractAddress, contractType);
      }

      // Update sync state
      await prisma.blockchainSyncState.update({
        where: { contractAddress },
        data: {
          lastProcessedBlock: toBlock,
          lastProcessedAt: new Date(),
          errorCount: 0,
          lastError: null,
        },
      });
    } catch (error: any) {
      console.error(`Error syncing contract ${contractAddress}:`, error);

      // Update error count
      await prisma.blockchainSyncState.update({
        where: { contractAddress },
        data: {
          errorCount: { increment: 1 },
          lastError: error.message,
        },
      });
    }
  }

  /**
   * Process a blockchain event
   */
  private async processEvent(
    event: ethers.Log,
    contractAddress: string,
    contractType: string
  ): Promise<void> {
    try {
      // Check if event already exists
      const existing = await prisma.blockchainEvent.findUnique({
        where: {
          txHash_logIndex: {
            txHash: event.transactionHash,
            logIndex: event.index,
          },
        },
      });

      if (existing) {
        return; // Already processed
      }

      // Parse event data
      const abi = contractType === 'VCToken' ? VC_TOKEN_ABI : TOKEN_OFFERING_ABI;
      const contract = this.blockchainService.getContract(contractAddress, abi);
      const parsedEvent = contract.interface.parseLog({
        topics: event.topics as string[],
        data: event.data,
      });

      if (!parsedEvent) {
        return; // Could not parse event
      }

      // Get or create transaction
      let transaction = await prisma.blockchainTransaction.findUnique({
        where: { txHash: event.transactionHash },
      });

      if (!transaction) {
        const tx = await this.blockchainService.getProvider().getTransaction(event.transactionHash);
        if (!tx) return;

        transaction = await prisma.blockchainTransaction.create({
          data: {
            txHash: event.transactionHash,
            contractAddress,
            functionName: 'unknown',
            fromAddress: tx.from,
            toAddress: tx.to || null,
            value: tx.value.toString(),
            gasLimit: tx.gasLimit?.toString() || null,
            gasPrice: tx.gasPrice?.toString() || null,
            status: 'pending',
            metadata: {},
          },
        });
      }

      // Create event record
      const eventData: Record<string, any> = {};
      if (parsedEvent.args) {
        parsedEvent.args.forEach((arg: any, index: number) => {
          const name = parsedEvent.fragment.inputs[index]?.name || `arg${index}`;
          eventData[name] = arg.toString();
        });
      }

      await prisma.blockchainEvent.create({
        data: {
          txHash: event.transactionHash,
          contractAddress,
          eventName: parsedEvent.name,
          blockNumber: Number(event.blockNumber),
          blockHash: event.blockHash,
          logIndex: event.index,
          eventData,
          processed: false,
        },
      });

      // Update transaction status if confirmed
      if (transaction.status === 'pending') {
        const receipt = await this.blockchainService.getTransactionReceipt(event.transactionHash);
        if (receipt) {
          await prisma.blockchainTransaction.update({
            where: { txHash: event.transactionHash },
            data: {
              status: receipt.status === 1 ? 'confirmed' : 'failed',
              blockNumber: receipt.blockNumber,
              blockHash: receipt.blockHash,
              gasUsed: receipt.gasUsed.toString(),
              confirmedAt: new Date(),
            },
          });
        }
      }
    } catch (error) {
      console.error('Error processing event:', error);
    }
  }

  /**
   * Register a contract for synchronization
   */
  async registerContract(
    contractAddress: string,
    contractType: 'VCToken' | 'TokenOffering'
  ): Promise<void> {
    await prisma.blockchainSyncState.upsert({
      where: { contractAddress },
      create: {
        contractAddress,
        contractType,
        lastProcessedBlock: 0,
        isActive: true,
      },
      update: {
        contractType,
        isActive: true,
      },
    });
  }

  /**
   * Handle blockchain reorganization (reorg)
   */
  async handleReorg(blockNumber: number): Promise<void> {
    // Remove events and transactions from reorged blocks
    await prisma.blockchainEvent.deleteMany({
      where: {
        blockNumber: { gte: blockNumber },
      },
    });

    await prisma.blockchainTransaction.updateMany({
      where: {
        blockNumber: { gte: blockNumber },
      },
      data: {
        status: 'failed',
        error: 'Blockchain reorganization',
      },
    });

    // Update sync states to re-sync from reorg point
    await prisma.blockchainSyncState.updateMany({
      where: {
        lastProcessedBlock: { gte: blockNumber },
      },
      data: {
        lastProcessedBlock: blockNumber - 1,
      },
    });
  }

  /**
   * Get sync status for all contracts
   */
  async getSyncStatus(): Promise<Array<{
    contractAddress: string;
    contractType: string;
    lastProcessedBlock: number;
    lastProcessedAt: Date;
    isActive: boolean;
    errorCount: number;
  }>> {
    const states = await prisma.blockchainSyncState.findMany({
      orderBy: { lastProcessedAt: 'desc' },
    });

    return states.map(state => ({
      contractAddress: state.contractAddress,
      contractType: state.contractType,
      lastProcessedBlock: state.lastProcessedBlock,
      lastProcessedAt: state.lastProcessedAt,
      isActive: state.isActive,
      errorCount: state.errorCount,
    }));
  }
}

// Singleton instance
let blockchainSyncServiceInstance: BlockchainSyncService | null = null;

export const getBlockchainSyncService = (): BlockchainSyncService => {
  if (!blockchainSyncServiceInstance) {
    blockchainSyncServiceInstance = new BlockchainSyncService();
  }
  return blockchainSyncServiceInstance;
};

