/**
 * Blockchain Configuration
 * Configuration for blockchain network connections and contract addresses
 */

export interface BlockchainConfig {
  network: 'polygon' | 'mumbai' | 'localhost';
  rpcUrl: string;
  chainId: number;
  vcTokenAddress?: string;
  tokenOfferingAddress?: string;
  privateKey?: string; // For service account (hot wallet)
  gasLimit: number;
  gasPrice?: bigint;
  confirmations: number;
}

const getNetworkConfig = (): BlockchainConfig => {
  const network = (process.env.BLOCKCHAIN_NETWORK || 'mumbai') as 'polygon' | 'mumbai' | 'localhost';

  const configs: Record<string, BlockchainConfig> = {
    polygon: {
      network: 'polygon',
      rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
      chainId: 137,
      gasLimit: 500000,
      confirmations: 3,
    },
    mumbai: {
      network: 'mumbai',
      rpcUrl: process.env.MUMBAI_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
      chainId: 80001,
      gasLimit: 500000,
      confirmations: 2,
    },
    localhost: {
      network: 'localhost',
      rpcUrl: 'http://127.0.0.1:8545',
      chainId: 1337,
      gasLimit: 500000,
      confirmations: 1,
    },
  };

  const config = configs[network];
  
  // Add contract addresses if provided
  if (process.env.VC_TOKEN_ADDRESS) {
    config.vcTokenAddress = process.env.VC_TOKEN_ADDRESS;
  }
  
  if (process.env.TOKEN_OFFERING_ADDRESS) {
    config.tokenOfferingAddress = process.env.TOKEN_OFFERING_ADDRESS;
  }

  // Add private key for service account (hot wallet)
  if (process.env.BLOCKCHAIN_PRIVATE_KEY) {
    config.privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
  }

  return config;
};

export const blockchainConfig = getNetworkConfig();

// Contract ABIs (will be imported from compiled contracts)
export const VC_TOKEN_ABI = [
  // ERC20 standard functions
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  
  // VCToken specific functions
  'function mint(address to, uint256 amount)',
  'function burn(address from, uint256 amount)',
  'function pause()',
  'function unpause()',
  'function setTransferRestrictions(bool enabled)',
  'function addToWhitelist(address account)',
  'function removeFromWhitelist(address account)',
  'function batchAddToWhitelist(address[] accounts)',
  'function batchRemoveFromWhitelist(address[] accounts)',
  'function isWhitelisted(address account) view returns (bool)',
  'function transferRestrictionsEnabled() view returns (bool)',
  
  // Events
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
  'event WhitelistAdded(address indexed account)',
  'event WhitelistRemoved(address indexed account)',
  'event TransferRestrictionsToggled(bool enabled)',
  'event Paused(address account)',
  'event Unpaused(address account)',
];

export const TOKEN_OFFERING_ABI = [
  // Offering management
  'function createOffering(address vcToken, uint256 offeringPrice, uint256 minInvestment, uint256 maxInvestment, uint256 totalTokensOffered, uint256 startDate, uint256 endDate, bool whitelistRequired) returns (uint256)',
  'function purchaseTokens(uint256 offeringId, uint256 tokenAmount) payable',
  'function updateOfferingStatus(uint256 offeringId, uint8 status)',
  'function cancelOffering(uint256 offeringId)',
  'function getOffering(uint256 offeringId) view returns (address vcToken, uint256 offeringPrice, uint256 minInvestment, uint256 maxInvestment, uint256 totalTokensOffered, uint256 tokensSold, uint256 startDate, uint256 endDate, uint8 status, bool whitelistRequired)',
  'function getUserPurchase(uint256 offeringId, address user) view returns (uint256)',
  'function isWhitelisted(uint256 offeringId, address account) view returns (bool)',
  'function addToWhitelist(uint256 offeringId, address account)',
  'function removeFromWhitelist(uint256 offeringId, address account)',
  'function batchAddToWhitelist(uint256 offeringId, address[] accounts)',
  'function withdraw()',
  
  // Events
  'event OfferingCreated(uint256 indexed offeringId, address indexed vcToken, uint256 offeringPrice, uint256 totalTokensOffered)',
  'event OfferingStatusUpdated(uint256 indexed offeringId, uint8 status)',
  'event TokensPurchased(uint256 indexed offeringId, address indexed buyer, uint256 amount, uint256 totalPaid)',
  'event WhitelistUpdated(uint256 indexed offeringId, address indexed account, bool whitelisted)',
  'event OfferingCancelled(uint256 indexed offeringId)',
];

