import { ethers } from 'ethers';
import { getBlockchainService } from './BlockchainService';
import { blockchainConfig, TOKEN_OFFERING_ABI } from '../../config/blockchain';

/**
 * TokenOfferingService
 * Service for interacting with TokenOffering smart contract
 */
export class TokenOfferingService {
  private blockchainService = getBlockchainService();
  private contractAddress: string;

  constructor(contractAddress?: string) {
    this.contractAddress = contractAddress || blockchainConfig.tokenOfferingAddress || '';
    if (!this.contractAddress) {
      throw new Error('TokenOffering contract address not configured');
    }
  }

  /**
   * Get contract instance (read-only)
   */
  private getContract(): ethers.Contract {
    return this.blockchainService.getContract(this.contractAddress, TOKEN_OFFERING_ABI);
  }

  /**
   * Get contract instance with signer (for transactions)
   */
  private getContractWithSigner(): ethers.Contract {
    return this.blockchainService.getContractWithSigner(this.contractAddress, TOKEN_OFFERING_ABI);
  }

  /**
   * Create a new token offering
   */
  async createOffering(params: {
    vcToken: string;
    offeringPrice: bigint;
    minInvestment: bigint;
    maxInvestment: bigint;
    totalTokensOffered: bigint;
    startDate: number;
    endDate: number;
    whitelistRequired: boolean;
  }): Promise<ethers.TransactionResponse> {
    const contract = this.getContractWithSigner();
    return await contract.createOffering(
      params.vcToken,
      params.offeringPrice,
      params.minInvestment,
      params.maxInvestment,
      params.totalTokensOffered,
      params.startDate,
      params.endDate,
      params.whitelistRequired
    );
  }

  /**
   * Purchase tokens from an offering
   */
  async purchaseTokens(
    offeringId: bigint,
    tokenAmount: bigint,
    value: bigint
  ): Promise<ethers.TransactionResponse> {
    const contract = this.getContractWithSigner();
    return await contract.purchaseTokens(offeringId, tokenAmount, { value });
  }

  /**
   * Get offering details
   */
  async getOffering(offeringId: bigint): Promise<{
    vcToken: string;
    offeringPrice: bigint;
    minInvestment: bigint;
    maxInvestment: bigint;
    totalTokensOffered: bigint;
    tokensSold: bigint;
    startDate: bigint;
    endDate: bigint;
    status: number;
    whitelistRequired: boolean;
  }> {
    const contract = this.getContract();
    const result = await contract.getOffering(offeringId);
    return {
      vcToken: result[0],
      offeringPrice: result[1],
      minInvestment: result[2],
      maxInvestment: result[3],
      totalTokensOffered: result[4],
      tokensSold: result[5],
      startDate: result[6],
      endDate: result[7],
      status: result[8],
      whitelistRequired: result[9],
    };
  }

  /**
   * Get user purchase amount for an offering
   */
  async getUserPurchase(offeringId: bigint, userAddress: string): Promise<bigint> {
    const contract = this.getContract();
    return await contract.getUserPurchase(offeringId, userAddress);
  }

  /**
   * Check if user is whitelisted for an offering
   */
  async isWhitelisted(offeringId: bigint, address: string): Promise<boolean> {
    const contract = this.getContract();
    return await contract.isWhitelisted(offeringId, address);
  }

  /**
   * Update offering status
   */
  async updateOfferingStatus(
    offeringId: bigint,
    status: number
  ): Promise<ethers.TransactionResponse> {
    const contract = this.getContractWithSigner();
    return await contract.updateOfferingStatus(offeringId, status);
  }

  /**
   * Cancel an offering
   */
  async cancelOffering(offeringId: bigint): Promise<ethers.TransactionResponse> {
    const contract = this.getContractWithSigner();
    return await contract.cancelOffering(offeringId);
  }

  /**
   * Add address to offering whitelist
   */
  async addToWhitelist(
    offeringId: bigint,
    address: string
  ): Promise<ethers.TransactionResponse> {
    const contract = this.getContractWithSigner();
    return await contract.addToWhitelist(offeringId, address);
  }

  /**
   * Remove address from offering whitelist
   */
  async removeFromWhitelist(
    offeringId: bigint,
    address: string
  ): Promise<ethers.TransactionResponse> {
    const contract = this.getContractWithSigner();
    return await contract.removeFromWhitelist(offeringId, address);
  }

  /**
   * Batch add addresses to offering whitelist
   */
  async batchAddToWhitelist(
    offeringId: bigint,
    addresses: string[]
  ): Promise<ethers.TransactionResponse> {
    const contract = this.getContractWithSigner();
    return await contract.batchAddToWhitelist(offeringId, addresses);
  }

  /**
   * Listen to OfferingCreated events
   */
  onOfferingCreated(
    callback: (
      offeringId: bigint,
      vcToken: string,
      offeringPrice: bigint,
      totalTokensOffered: bigint,
      event: ethers.Log
    ) => void
  ): void {
    const contract = this.getContract();
    contract.on('OfferingCreated', (offeringId, vcToken, offeringPrice, totalTokensOffered, event) => {
      callback(offeringId, vcToken, offeringPrice, totalTokensOffered, event);
    });
  }

  /**
   * Listen to TokensPurchased events
   */
  onTokensPurchased(
    callback: (
      offeringId: bigint,
      buyer: string,
      amount: bigint,
      totalPaid: bigint,
      event: ethers.Log
    ) => void
  ): void {
    const contract = this.getContract();
    contract.on('TokensPurchased', (offeringId, buyer, amount, totalPaid, event) => {
      callback(offeringId, buyer, amount, totalPaid, event);
    });
  }

  /**
   * Get past TokensPurchased events
   */
  async getPastPurchases(
    offeringId: bigint,
    fromBlock: number,
    toBlock: number | 'latest' = 'latest'
  ): Promise<ethers.Log[]> {
    const contract = this.getContract();
    return await contract.queryFilter(
      contract.filters.TokensPurchased(offeringId),
      fromBlock,
      toBlock
    );
  }
}

