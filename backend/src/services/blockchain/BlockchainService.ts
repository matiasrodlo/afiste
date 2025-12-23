import { ethers } from 'ethers';
import { blockchainConfig, VC_TOKEN_ABI, TOKEN_OFFERING_ABI } from '../../config/blockchain';

// Service for blockchain interactions
export class BlockchainService {
  private provider: ethers.Provider;
  private signer?: ethers.Wallet;
  private network: string;

  constructor() {
    this.network = blockchainConfig.network;
    this.provider = new ethers.JsonRpcProvider(blockchainConfig.rpcUrl);

    if (blockchainConfig.privateKey) {
      this.signer = new ethers.Wallet(blockchainConfig.privateKey, this.provider);
    }
  }

  getProvider(): ethers.Provider {
    return this.provider;
  }

  /**
   * Get signer instance (for transactions)
   */
  getSigner(): ethers.Wallet | undefined {
    return this.signer;
  }

  /**
   * Get network information
   */
  async getNetwork(): Promise<ethers.Network> {
    return await this.provider.getNetwork();
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  /**
   * Get balance of an address
   */
  async getBalance(address: string): Promise<bigint> {
    return await this.provider.getBalance(address);
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    return await this.provider.getTransactionReceipt(txHash);
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = blockchainConfig.confirmations
  ): Promise<ethers.TransactionReceipt> {
    const receipt = await this.provider.waitForTransaction(txHash, confirmations);
    if (!receipt) {
      throw new Error(`Transaction ${txHash} not found or failed`);
    }
    return receipt;
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(transaction: ethers.TransactionRequest): Promise<bigint> {
    if (!this.signer) {
      throw new Error('Signer not initialized');
    }
    return await this.signer.estimateGas(transaction);
  }

  /**
   * Send a transaction
   */
  async sendTransaction(transaction: ethers.TransactionRequest): Promise<ethers.TransactionResponse> {
    if (!this.signer) {
      throw new Error('Signer not initialized');
    }
    return await this.signer.sendTransaction(transaction);
  }

  /**
   * Get contract instance (read-only)
   */
  getContract(address: string, abi: ethers.InterfaceAbi): ethers.Contract {
    return new ethers.Contract(address, abi, this.provider);
  }

  /**
   * Get contract instance with signer (for transactions)
   */
  getContractWithSigner(address: string, abi: ethers.InterfaceAbi): ethers.Contract {
    if (!this.signer) {
      throw new Error('Signer not initialized');
    }
    return new ethers.Contract(address, abi, this.signer);
  }

  /**
   * Parse units (e.g., "1.5" -> "1500000000000000000" for 18 decimals)
   */
  parseUnits(value: string, decimals: number = 18): bigint {
    return ethers.parseUnits(value, decimals);
  }

  /**
   * Format units (e.g., "1500000000000000000" -> "1.5" for 18 decimals)
   */
  formatUnits(value: bigint, decimals: number = 18): string {
    return ethers.formatUnits(value, decimals);
  }

  /**
   * Check if address is valid
   */
  isAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Get address checksum
   */
  getAddress(address: string): string {
    return ethers.getAddress(address);
  }
}

// Singleton instance
let blockchainServiceInstance: BlockchainService | null = null;

export const getBlockchainService = (): BlockchainService => {
  if (!blockchainServiceInstance) {
    blockchainServiceInstance = new BlockchainService();
  }
  return blockchainServiceInstance;
};

