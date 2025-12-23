import { ethers } from 'ethers';
import { getBlockchainService } from './BlockchainService';
import { VCTokenService } from './VCTokenService';
import { TokenOfferingService } from './TokenOfferingService';

/**
 * BlockchainEventListener
 * Listens to blockchain events and syncs with database
 */
export class BlockchainEventListener {
  private blockchainService = getBlockchainService();
  private listeners: Map<string, ethers.Contract> = new Map();
  private eventHandlers: Map<string, Set<(event: ethers.Log) => void>> = new Map();
  private monitoring: boolean = false;
  private lastProcessedBlock: number = 0;

  /**
   * Start listening to events
   */
  async start(): Promise<void> {
    if (this.monitoring) return;

    this.monitoring = true;
    this.lastProcessedBlock = await this.blockchainService.getBlockNumber();

    console.log('Blockchain event listener started');
  }

  /**
   * Stop listening to events
   */
  stop(): void {
    // Remove all listeners
    this.listeners.forEach(contract => {
      contract.removeAllListeners();
    });
    this.listeners.clear();
    this.eventHandlers.clear();
    this.monitoring = false;

    console.log('Blockchain event listener stopped');
  }

  /**
   * Listen to VCToken events
   */
  async listenToVCToken(
    contractAddress: string,
    handlers: {
      onTransfer?: (from: string, to: string, value: bigint, event: ethers.Log) => Promise<void>;
      onWhitelistAdded?: (account: string, event: ethers.Log) => Promise<void>;
      onWhitelistRemoved?: (account: string, event: ethers.Log) => Promise<void>;
      onTransferRestrictionsToggled?: (enabled: boolean, event: ethers.Log) => Promise<void>;
    }
  ): Promise<void> {
    const vcTokenService = new VCTokenService(contractAddress);

    if (handlers.onTransfer) {
      vcTokenService.onTransfer(async (from, to, value, event) => {
        try {
          await handlers.onTransfer!(from, to, value, event);
        } catch (error) {
          console.error('Error handling Transfer event:', error);
        }
      });
    }

    if (handlers.onWhitelistAdded) {
      vcTokenService.onWhitelistAdded(async (account, event) => {
        try {
          await handlers.onWhitelistAdded!(account, event);
        } catch (error) {
          console.error('Error handling WhitelistAdded event:', error);
        }
      });
    }

    if (handlers.onWhitelistRemoved) {
      vcTokenService.onWhitelistRemoved(async (account, event) => {
        try {
          await handlers.onWhitelistRemoved!(account, event);
        } catch (error) {
          console.error('Error handling WhitelistRemoved event:', error);
        }
      });
    }

    this.listeners.set(contractAddress, vcTokenService['getContract']());
  }

  /**
   * Listen to TokenOffering events
   */
  async listenToTokenOffering(
    contractAddress: string,
    handlers: {
      onOfferingCreated?: (
        offeringId: bigint,
        vcToken: string,
        offeringPrice: bigint,
        totalTokensOffered: bigint,
        event: ethers.Log
      ) => Promise<void>;
      onTokensPurchased?: (
        offeringId: bigint,
        buyer: string,
        amount: bigint,
        totalPaid: bigint,
        event: ethers.Log
      ) => Promise<void>;
      onOfferingStatusUpdated?: (offeringId: bigint, status: number, event: ethers.Log) => Promise<void>;
    }
  ): Promise<void> {
    const tokenOfferingService = new TokenOfferingService(contractAddress);

    if (handlers.onOfferingCreated) {
      tokenOfferingService.onOfferingCreated(async (offeringId, vcToken, offeringPrice, totalTokensOffered, event) => {
        try {
          await handlers.onOfferingCreated!(offeringId, vcToken, offeringPrice, totalTokensOffered, event);
        } catch (error) {
          console.error('Error handling OfferingCreated event:', error);
        }
      });
    }

    if (handlers.onTokensPurchased) {
      tokenOfferingService.onTokensPurchased(async (offeringId, buyer, amount, totalPaid, event) => {
        try {
          await handlers.onTokensPurchased!(offeringId, buyer, amount, totalPaid, event);
        } catch (error) {
          console.error('Error handling TokensPurchased event:', error);
        }
      });
    }

    this.listeners.set(contractAddress, tokenOfferingService['getContract']());
  }

  /**
   * Process past events (for catching up)
   */
  async processPastEvents(
    contractAddress: string,
    eventName: string,
    fromBlock: number,
    toBlock: number | 'latest',
    handler: (events: ethers.Log[]) => Promise<void>
  ): Promise<void> {
    try {
      const contract = this.blockchainService.getContract(contractAddress, []);
      const filter = contract.filters[eventName]();
      const events = await contract.queryFilter(filter, fromBlock, toBlock);

      if (events.length > 0) {
        await handler(events);
      }
    } catch (error) {
      console.error(`Error processing past events for ${contractAddress}:`, error);
    }
  }

  /**
   * Sync events from last processed block
   */
  async syncEvents(
    contractAddress: string,
    eventName: string,
    handler: (events: ethers.Log[]) => Promise<void>
  ): Promise<void> {
    try {
      const currentBlock = await this.blockchainService.getBlockNumber();
      const fromBlock = this.lastProcessedBlock > 0 ? this.lastProcessedBlock + 1 : currentBlock - 1000; // Last 1000 blocks if first sync

      await this.processPastEvents(contractAddress, eventName, fromBlock, currentBlock, handler);
      this.lastProcessedBlock = currentBlock;
    } catch (error) {
      console.error(`Error syncing events for ${contractAddress}:`, error);
    }
  }

  /**
   * Get last processed block
   */
  getLastProcessedBlock(): number {
    return this.lastProcessedBlock;
  }

  /**
   * Set last processed block
   */
  setLastProcessedBlock(blockNumber: number): void {
    this.lastProcessedBlock = blockNumber;
  }
}

// Singleton instance
let blockchainEventListenerInstance: BlockchainEventListener | null = null;

export const getBlockchainEventListener = (): BlockchainEventListener => {
  if (!blockchainEventListenerInstance) {
    blockchainEventListenerInstance = new BlockchainEventListener();
  }
  return blockchainEventListenerInstance;
};

