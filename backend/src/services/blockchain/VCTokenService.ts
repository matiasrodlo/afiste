import { ethers } from 'ethers';
import { getBlockchainService } from './BlockchainService';
import { blockchainConfig, VC_TOKEN_ABI } from '../../config/blockchain';

/**
 * VCTokenService
 * Service for interacting with VCToken smart contract
 */
export class VCTokenService {
  private blockchainService = getBlockchainService();
  private contractAddress: string;

  constructor(contractAddress?: string) {
    this.contractAddress = contractAddress || blockchainConfig.vcTokenAddress || '';
    if (!this.contractAddress) {
      throw new Error('VCToken contract address not configured');
    }
  }

  /**
   * Get contract instance (read-only)
   */
  private getContract(): ethers.Contract {
    return this.blockchainService.getContract(this.contractAddress, VC_TOKEN_ABI);
  }

  /**
   * Get contract instance with signer (for transactions)
   */
  private getContractWithSigner(): ethers.Contract {
    return this.blockchainService.getContractWithSigner(this.contractAddress, VC_TOKEN_ABI);
  }

  /**
   * Get token name
   */
  async getName(): Promise<string> {
    const contract = this.getContract();
    return await contract.name();
  }

  /**
   * Get token symbol
   */
  async getSymbol(): Promise<string> {
    const contract = this.getContract();
    return await contract.symbol();
  }

  /**
   * Get token decimals
   */
  async getDecimals(): Promise<number> {
    const contract = this.getContract();
    return await contract.decimals();
  }

  /**
   * Get total supply
   */
  async getTotalSupply(): Promise<bigint> {
    const contract = this.getContract();
    return await contract.totalSupply();
  }

  /**
   * Get balance of an address
   */
  async getBalance(address: string): Promise<bigint> {
    const contract = this.getContract();
    return await contract.balanceOf(address);
  }

  /**
   * Check if address is whitelisted
   */
  async isWhitelisted(address: string): Promise<boolean> {
    const contract = this.getContract();
    return await contract.isWhitelisted(address);
  }

  /**
   * Check if transfer restrictions are enabled
   */
  async areTransferRestrictionsEnabled(): Promise<boolean> {
    const contract = this.getContract();
    return await contract.transferRestrictionsEnabled();
  }

  /**
   * Mint tokens to an address
   */
  async mint(to: string, amount: bigint): Promise<ethers.TransactionResponse> {
    const contract = this.getContractWithSigner();
    return await contract.mint(to, amount);
  }

  /**
   * Burn tokens from an address
   */
  async burn(from: string, amount: bigint): Promise<ethers.TransactionResponse> {
    const contract = this.getContractWithSigner();
    return await contract.burn(from, amount);
  }

  /**
   * Pause token transfers
   */
  async pause(): Promise<ethers.TransactionResponse> {
    const contract = this.getContractWithSigner();
    return await contract.pause();
  }

  /**
   * Unpause token transfers
   */
  async unpause(): Promise<ethers.TransactionResponse> {
    const contract = this.getContractWithSigner();
    return await contract.unpause();
  }

  /**
   * Set transfer restrictions
   */
  async setTransferRestrictions(enabled: boolean): Promise<ethers.TransactionResponse> {
    const contract = this.getContractWithSigner();
    return await contract.setTransferRestrictions(enabled);
  }

  /**
   * Add address to whitelist
   */
  async addToWhitelist(address: string): Promise<ethers.TransactionResponse> {
    const contract = this.getContractWithSigner();
    return await contract.addToWhitelist(address);
  }

  /**
   * Remove address from whitelist
   */
  async removeFromWhitelist(address: string): Promise<ethers.TransactionResponse> {
    const contract = this.getContractWithSigner();
    return await contract.removeFromWhitelist(address);
  }

  /**
   * Batch add addresses to whitelist
   */
  async batchAddToWhitelist(addresses: string[]): Promise<ethers.TransactionResponse> {
    const contract = this.getContractWithSigner();
    return await contract.batchAddToWhitelist(addresses);
  }

  /**
   * Batch remove addresses from whitelist
   */
  async batchRemoveFromWhitelist(addresses: string[]): Promise<ethers.TransactionResponse> {
    const contract = this.getContractWithSigner();
    return await contract.batchRemoveFromWhitelist(addresses);
  }

  /**
   * Listen to Transfer events
   */
  onTransfer(
    callback: (from: string, to: string, value: bigint, event: ethers.Log) => void
  ): void {
    const contract = this.getContract();
    contract.on('Transfer', (from, to, value, event) => {
      callback(from, to, value, event);
    });
  }

  /**
   * Listen to WhitelistAdded events
   */
  onWhitelistAdded(callback: (account: string, event: ethers.Log) => void): void {
    const contract = this.getContract();
    contract.on('WhitelistAdded', (account, event) => {
      callback(account, event);
    });
  }

  /**
   * Listen to WhitelistRemoved events
   */
  onWhitelistRemoved(callback: (account: string, event: ethers.Log) => void): void {
    const contract = this.getContract();
    contract.on('WhitelistRemoved', (account, event) => {
      callback(account, event);
    });
  }

  /**
   * Get past Transfer events
   */
  async getPastTransfers(
    fromBlock: number,
    toBlock: number | 'latest' = 'latest',
    filter?: { from?: string; to?: string }
  ): Promise<ethers.Log[]> {
    const contract = this.getContract();
    const filterObj: any = {
      fromBlock,
      toBlock,
    };
    
    if (filter?.from) {
      filterObj.from = filter.from;
    }
    if (filter?.to) {
      filterObj.to = filter.to;
    }

    return await contract.queryFilter(contract.filters.Transfer(filter?.from, filter?.to), fromBlock, toBlock);
  }
}

