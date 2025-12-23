import { getNetworkConfig, getBlockExplorerUrl, getBlockExplorerAddressUrl } from '../services/blockchain/web3';

/**
 * Get network name
 */
export const getNetworkName = (chainId?: number): string => {
  const networkConfig = getNetworkConfig();
  if (chainId) {
    if (chainId === 137) return 'Polygon';
    if (chainId === 80001) return 'Mumbai';
    return `Chain ${chainId}`;
  }
  return networkConfig.name;
};

/**
 * Format transaction hash for display
 */
export const formatTxHash = (txHash: string, chars: number = 8): string => {
  if (!txHash) return '';
  return `${txHash.slice(0, chars + 2)}...${txHash.slice(-chars)}`;
};

/**
 * Get transaction explorer URL
 */
export const getTransactionUrl = (txHash: string): string => {
  return getBlockExplorerUrl(txHash);
};

/**
 * Get address explorer URL
 */
export const getAddressUrl = (address: string): string => {
  return getBlockExplorerAddressUrl(address);
};

/**
 * Format token amount
 */
export const formatTokenAmount = (amount: string | bigint, decimals: number = 18): string => {
  const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
  const divisor = BigInt(10 ** decimals);
  const whole = amountBigInt / divisor;
  const fraction = amountBigInt % divisor;
  
  if (fraction === BigInt(0)) {
    return whole.toString();
  }
  
  const fractionStr = fraction.toString().padStart(decimals, '0');
  const trimmed = fractionStr.replace(/0+$/, '');
  
  return `${whole}.${trimmed}`;
};

/**
 * Parse token amount
 */
export const parseTokenAmount = (amount: string, decimals: number = 18): bigint => {
  const [whole, fraction = ''] = amount.split('.');
  const fractionPadded = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole) * BigInt(10 ** decimals) + BigInt(fractionPadded || '0');
};

/**
 * Calculate gas cost in native currency
 */
export const calculateGasCost = (gasUsed: bigint, gasPrice: bigint): bigint => {
  return gasUsed * gasPrice;
};

/**
 * Format gas cost
 */
export const formatGasCost = (gasCost: bigint): string => {
  return ethers.formatEther(gasCost);
};

// Import ethers for formatEther
import { ethers } from 'ethers';

