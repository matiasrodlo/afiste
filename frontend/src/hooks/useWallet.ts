import { useState, useEffect, useCallback } from 'react';
import { getWalletService, WalletState, WalletType } from '../services/blockchain/wallet';
import { isMetaMaskInstalled } from '../services/blockchain/web3';

/**
 * useWallet Hook
 * React hook for wallet connection and state management
 */
export const useWallet = () => {
  const walletService = getWalletService();
  const [state, setState] = useState<WalletState>(walletService.getState());
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to wallet state changes
  useEffect(() => {
    const unsubscribe = walletService.onStateChange((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  /**
   * Connect to MetaMask
   */
  const connect = useCallback(async () => {
    if (!isMetaMaskInstalled()) {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      await walletService.connectMetaMask();
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(() => {
    walletService.disconnect();
    setError(null);
  }, []);

  /**
   * Refresh balance
   */
  const refreshBalance = useCallback(async () => {
    try {
      await walletService.refreshBalance();
    } catch (err: any) {
      setError(err.message || 'Failed to refresh balance');
    }
  }, []);

  /**
   * Sign message
   */
  const signMessage = useCallback(async (message: string): Promise<string> => {
    try {
      return await walletService.signMessage(message);
    } catch (err: any) {
      setError(err.message || 'Failed to sign message');
      throw err;
    }
  }, []);

  /**
   * Send transaction
   */
  const sendTransaction = useCallback(
    async (transaction: any): Promise<any> => {
      try {
        return await walletService.sendTransaction(transaction);
      } catch (err: any) {
        setError(err.message || 'Failed to send transaction');
        throw err;
      }
    },
    []
  );

  /**
   * Estimate gas
   */
  const estimateGas = useCallback(
    async (transaction: any): Promise<bigint> => {
      try {
        return await walletService.estimateGas(transaction);
      } catch (err: any) {
        setError(err.message || 'Failed to estimate gas');
        throw err;
      }
    },
    []
  );

  return {
    // State
    isConnected: state.isConnected,
    address: state.address,
    network: state.network,
    balance: state.balance,
    walletType: state.walletType,
    isConnecting,
    error,

    // Actions
    connect,
    disconnect,
    refreshBalance,
    signMessage,
    sendTransaction,
    estimateGas,

    // Service access
    getSigner: () => walletService.getSigner(),
    getProvider: () => walletService.getProvider(),
  };
};

