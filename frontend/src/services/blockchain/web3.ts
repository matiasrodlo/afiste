import { ethers } from 'ethers';

// Web3 provider and network config
export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// Polygon mainnet config
export const POLYGON_NETWORK: NetworkConfig = {
  chainId: 137,
  name: 'Polygon',
  rpcUrl: process.env.REACT_APP_POLYGON_RPC_URL || 'https://polygon-rpc.com',
  blockExplorer: 'https://polygonscan.com',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
};

// Mumbai testnet config
export const MUMBAI_NETWORK: NetworkConfig = {
  chainId: 80001,
  name: 'Mumbai',
  rpcUrl: process.env.REACT_APP_MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
  blockExplorer: 'https://mumbai.polygonscan.com',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
};

// Get the right network config based on env
export const getNetworkConfig = (): NetworkConfig => {
  const network = process.env.REACT_APP_BLOCKCHAIN_NETWORK || 'mumbai';
  return network === 'polygon' ? POLYGON_NETWORK : MUMBAI_NETWORK;
};

// Get the Web3 provider if MetaMask is available
export const getProvider = (): ethers.BrowserProvider | null => {
  if (typeof window.ethereum !== 'undefined') {
    return new ethers.BrowserProvider(window.ethereum);
  }
  return null;
}

// Get JsonRpc provider (fallback)
export const getJsonRpcProvider = (): ethers.JsonRpcProvider => {
  const networkConfig = getNetworkConfig();
  return new ethers.JsonRpcProvider(networkConfig.rpcUrl);
}

// Check if MetaMask is installed
export const isMetaMaskInstalled = (): boolean => {
  if (typeof window.ethereum === 'undefined') {
    return false;
  }
  return Boolean(window.ethereum.isMetaMask);
}

// Request account access from MetaMask
export const requestAccountAccess = async (): Promise<string[]> => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  return await window.ethereum.request({ method: 'eth_requestAccounts' });
}

// Switch to network or add it if it doesn't exist
export const switchNetwork = async (networkConfig: NetworkConfig): Promise<void> => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${networkConfig.chainId.toString(16)}` }],
    });
  } catch (switchError: any) {
    // Network doesn't exist, so add it
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${networkConfig.chainId.toString(16)}`,
            chainName: networkConfig.name,
            nativeCurrency: networkConfig.nativeCurrency,
            rpcUrls: [networkConfig.rpcUrl],
            blockExplorerUrls: networkConfig.blockExplorer ? [networkConfig.blockExplorer] : [],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

// Get the current network chain ID
export const getCurrentNetwork = async (): Promise<number | null> => {
  if (!window.ethereum) {
    return null;
  }

  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return parseInt(chainId, 16);
  } catch {
    return null;
  }
}

// Shorten an address for display (e.g., 0x1234...5678)
export const formatAddress = (address: string, chars: number = 4): string => {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Validate address
 */
export const isValidAddress = (address: string): boolean => {
  return ethers.isAddress(address);
}

// Get block explorer URL for a transaction
export const getBlockExplorerUrl = (txHash: string, networkConfig?: NetworkConfig): string => {
  const config = networkConfig || getNetworkConfig();
  if (!config.blockExplorer) {
    return '#';
  }
  return `${config.blockExplorer}/tx/${txHash}`;
}

// Get block explorer URL for an address
export const getBlockExplorerAddressUrl = (address: string, networkConfig?: NetworkConfig): string => {
  const config = networkConfig || getNetworkConfig();
  if (!config.blockExplorer) {
    return '#';
  }
  return `${config.blockExplorer}/address/${address}`;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

