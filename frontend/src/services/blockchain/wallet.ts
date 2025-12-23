import { ethers } from 'ethers';
import {
  getProvider,
  getNetworkConfig,
  switchNetwork,
  getCurrentNetwork,
  requestAccountAccess,
  isMetaMaskInstalled,
} from './web3';

export enum WalletType {
  METAMASK = 'metamask',
  WALLETCONNECT = 'walletconnect',
  NONE = 'none',
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  network: number | null;
  walletType: WalletType;
  balance: string | null;
}

export class WalletService {
  private state: WalletState = {
    isConnected: false,
    address: null,
    provider: null,
    signer: null,
    network: null,
    walletType: WalletType.NONE,
    balance: null,
  };

  private listeners: Set<(state: WalletState) => void> = new Set();

  async connectMetaMask(): Promise<WalletState> {
    if (!isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    // Request account access
    const accounts = await requestAccountAccess();
    if (accounts.length === 0) {
      throw new Error('No accounts found');
    }

    const address = accounts[0];

    // Get provider and signer
    const provider = getProvider();
    if (!provider) {
      throw new Error('Failed to get provider');
    }

    const signer = await provider.getSigner();

    // Switch to correct network
    const networkConfig = getNetworkConfig();
    const currentNetwork = await getCurrentNetwork();
    if (currentNetwork !== networkConfig.chainId) {
      await switchNetwork(networkConfig);
    }

    // Get network and balance
    const network = await provider.getNetwork();
    const balance = await provider.getBalance(address);

    // Update state
    this.state = {
      isConnected: true,
      address,
      provider,
      signer,
      network: Number(network.chainId),
      walletType: WalletType.METAMASK,
      balance: ethers.formatEther(balance),
    };

    // Set up event listeners
    this.setupEventListeners();

    // Notify listeners
    this.notifyListeners();

    return this.state;
  }

  disconnect(): void {
    this.state = {
      isConnected: false,
      address: null,
      provider: null,
      signer: null,
      network: null,
      walletType: WalletType.NONE,
      balance: null,
    };

    // Remove event listeners
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', this.handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', this.handleChainChanged);
    }

    this.notifyListeners();
  }

  getState(): WalletState {
    return { ...this.state };
  }

  getSigner(): ethers.JsonRpcSigner | null {
    return this.state.signer;
  }

  getProvider(): ethers.BrowserProvider | null {
    return this.state.provider;
  }

  async refreshBalance(): Promise<void> {
    if (!this.state.address || !this.state.provider) {
      return;
    }

    const balance = await this.state.provider.getBalance(this.state.address);
    this.state.balance = ethers.formatEther(balance);
    this.notifyListeners();
  }

  async signMessage(message: string): Promise<string> {
    if (!this.state.signer) {
      throw new Error('Wallet not connected');
    }

    return await this.state.signer.signMessage(message);
  }

  async sendTransaction(transaction: ethers.TransactionRequest): Promise<ethers.TransactionResponse> {
    if (!this.state.signer) {
      throw new Error('Wallet not connected');
    }

    return await this.state.signer.sendTransaction(transaction);
  }

  async estimateGas(transaction: ethers.TransactionRequest): Promise<bigint> {
    if (!this.state.provider) {
      throw new Error('Provider not available');
    }

    return await this.state.provider.estimateGas(transaction);
  }

  /**
   * Add state change listener
   */
  onStateChange(listener: (state: WalletState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    if (!window.ethereum) {
      return;
    }

    window.ethereum.on('accountsChanged', this.handleAccountsChanged.bind(this));
    window.ethereum.on('chainChanged', this.handleChainChanged.bind(this));
  }

  /**
   * Handle accounts changed
   */
  private async handleAccountsChanged(accounts: string[]): Promise<void> {
    if (accounts.length === 0) {
      this.disconnect();
    } else {
      // Reconnect with new account
      await this.connectMetaMask();
    }
  }

  /**
   * Handle chain changed
   */
  private async handleChainChanged(chainId: string): Promise<void> {
    const networkId = parseInt(chainId, 16);
    this.state.network = networkId;

    // Refresh balance
    await this.refreshBalance();

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
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

