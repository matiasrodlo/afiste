import { ethers } from 'ethers';
import { getProvider, getJsonRpcProvider } from './web3';

// Frontend ABI (simplified for frontend use)
const VC_TOKEN_ABI_FRONTEND = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function isWhitelisted(address) view returns (bool)',
  'function transferRestrictionsEnabled() view returns (bool)',
];

// Frontend service for interacting with VCToken contracts
export class VCTokenService {
  private contractAddress: string;
  private provider: ethers.Provider;

  constructor(contractAddress: string) {
    this.contractAddress = contractAddress;
    this.provider = getProvider() || getJsonRpcProvider();
  }

  private getContract(): ethers.Contract {
    return new ethers.Contract(this.contractAddress, VC_TOKEN_ABI_FRONTEND, this.provider);
  }

  // Get contract with signer for transactions
  private async getContractWithSigner(): Promise<ethers.Contract> {
    const provider = getProvider();
    if (!provider) {
      throw new Error('No provider available');
    }

    const signer = await provider.getSigner();
    return new ethers.Contract(this.contractAddress, VC_TOKEN_ABI_FRONTEND, signer);
  }

  async getName(): Promise<string> {
    const contract = this.getContract();
    return await contract.name();
  }

  async getSymbol(): Promise<string> {
    const contract = this.getContract();
    return await contract.symbol();
  }

  async getDecimals(): Promise<number> {
    const contract = this.getContract();
    return await contract.decimals();
  }

  async getTotalSupply(): Promise<bigint> {
    const contract = this.getContract();
    return await contract.totalSupply();
  }

  async getBalance(address: string): Promise<bigint> {
    const contract = this.getContract();
    return await contract.balanceOf(address);
  }

  async isWhitelisted(address: string): Promise<boolean> {
    const contract = this.getContract();
    return await contract.isWhitelisted(address);
  }

  async areTransferRestrictionsEnabled(): Promise<boolean> {
    const contract = this.getContract();
    return await contract.transferRestrictionsEnabled();
  }

  // Transfer tokens (needs signer)
  async transfer(to: string, amount: bigint): Promise<ethers.TransactionResponse> {
    const contract = await this.getContractWithSigner();
    return await contract.transfer(to, amount);
  }
}

