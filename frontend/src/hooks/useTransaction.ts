import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './useWallet';

/**
 * Transaction Status
 */
export enum TransactionStatus {
  IDLE = 'idle',
  PREPARING = 'preparing',
  SIGNING = 'signing',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

/**
 * Transaction State
 */
export interface TransactionState {
  status: TransactionStatus;
  txHash: string | null;
  receipt: ethers.TransactionReceipt | null;
  error: string | null;
  gasEstimate: bigint | null;
}

/**
 * useTransaction Hook
 * React hook for transaction management
 */
export const useTransaction = () => {
  const { sendTransaction, estimateGas, getProvider } = useWallet();
  const [state, setState] = useState<TransactionState>({
    status: TransactionStatus.IDLE,
    txHash: null,
    receipt: null,
    error: null,
    gasEstimate: null,
  });

  /**
   * Estimate gas for a transaction
   */
  const estimate = useCallback(async (transaction: ethers.TransactionRequest) => {
    try {
      setState(prev => ({ ...prev, status: TransactionStatus.PREPARING }));
      const gasEstimate = await estimateGas(transaction);
      setState(prev => ({ ...prev, gasEstimate, status: TransactionStatus.IDLE }));
      return gasEstimate;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message,
        status: TransactionStatus.IDLE,
      }));
      throw error;
    }
  }, [estimateGas]);

  /**
   * Send a transaction
   */
  const send = useCallback(
    async (
      transaction: ethers.TransactionRequest,
      options?: {
        waitForConfirmation?: boolean;
        confirmations?: number;
      }
    ) => {
      try {
        setState({
          status: TransactionStatus.PREPARING,
          txHash: null,
          receipt: null,
          error: null,
          gasEstimate: null,
        });

        // Estimate gas if not provided
        if (!transaction.gasLimit) {
          const gasEstimate = await estimateGas(transaction);
          transaction.gasLimit = gasEstimate + (gasEstimate / BigInt(10)); // Add 10% buffer
          setState(prev => ({ ...prev, gasEstimate }));
        }

        // Send transaction
        setState(prev => ({ ...prev, status: TransactionStatus.SIGNING }));
        const txResponse = await sendTransaction(transaction);

        setState(prev => ({
          ...prev,
          status: TransactionStatus.PENDING,
          txHash: txResponse.hash,
        }));

        // Wait for confirmation if requested
        if (options?.waitForConfirmation !== false) {
          const provider = getProvider();
          if (provider) {
            const confirmations = options?.confirmations || 1;
            const receipt = await provider.waitForTransaction(
              txResponse.hash,
              confirmations
            );

            if (receipt) {
              setState(prev => ({
                ...prev,
                status: receipt.status === 1 ? TransactionStatus.CONFIRMED : TransactionStatus.FAILED,
                receipt,
              }));

              return receipt;
            }
          }
        }

        return txResponse;
      } catch (error: any) {
        setState(prev => ({
          ...prev,
          status: TransactionStatus.FAILED,
          error: error.message || 'Transaction failed',
        }));
        throw error;
      }
    },
    [sendTransaction, estimateGas, getProvider]
  );

  /**
   * Reset transaction state
   */
  const reset = useCallback(() => {
    setState({
      status: TransactionStatus.IDLE,
      txHash: null,
      receipt: null,
      error: null,
      gasEstimate: null,
    });
  }, []);

  /**
   * Check transaction status
   */
  const checkStatus = useCallback(async (txHash: string) => {
    const provider = getProvider();
    if (!provider) {
      throw new Error('Provider not available');
    }

    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt) {
        setState(prev => ({
          ...prev,
          status: receipt.status === 1 ? TransactionStatus.CONFIRMED : TransactionStatus.FAILED,
          receipt,
        }));
        return receipt;
      }

      // Transaction still pending
      setState(prev => ({
        ...prev,
        status: TransactionStatus.PENDING,
      }));
      return null;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message,
        status: TransactionStatus.FAILED,
      }));
      throw error;
    }
  }, [getProvider]);

  return {
    // State
    status: state.status,
    txHash: state.txHash,
    receipt: state.receipt,
    error: state.error,
    gasEstimate: state.gasEstimate,

    // Actions
    send,
    estimate,
    reset,
    checkStatus,

    // Helpers
    isIdle: state.status === TransactionStatus.IDLE,
    isPending: state.status === TransactionStatus.PENDING,
    isConfirmed: state.status === TransactionStatus.CONFIRMED,
    isFailed: state.status === TransactionStatus.FAILED,
  };
};

