import { Router } from 'express';
import { getWalletService } from '../../../services/wallet/WalletService';
import { getHotWalletService } from '../../../services/wallet/HotWalletService';
import { getBlockchainService } from '../../../services/blockchain/BlockchainService';
import { VCTokenService } from '../../../services/blockchain/VCTokenService';

const router = Router();
const walletService = getWalletService();
const hotWalletService = getHotWalletService();
const blockchainService = getBlockchainService();

// Middleware to get user ID from auth (placeholder - would use actual auth middleware)
const getUserFromRequest = (req: any): string => {
  // In production, this would extract from JWT token
  return req.user?.id || req.headers['x-user-id'] || '';
};

/**
 * GET /api/v2/account/wallets
 * Get user wallets
 */
router.get('/', async (req, res) => {
  try {
    const userId = getUserFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const wallets = await walletService.getUserWallets(userId);

    // Get balances for each wallet
    const walletsWithBalances = await Promise.all(
      wallets.map(async wallet => {
        const balance = await walletService.getBalance(wallet.address);
        return {
          id: wallet.id,
          address: wallet.address,
          type: wallet.type,
          status: wallet.status,
          balance: blockchainService.formatUnits(balance),
          balanceWei: balance.toString(),
          createdAt: wallet.createdAt,
        };
      })
    );

    res.json({
      wallets: walletsWithBalances,
      total: walletsWithBalances.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/account/wallets/:address
 * Get user wallet details
 */
router.get('/:address', async (req, res) => {
  try {
    const userId = getUserFromRequest(req);
    const { address } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const wallet = await walletService.getWallet(address);

    if (!wallet || wallet.userId !== userId) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const balance = await walletService.getBalance(address);
    const formattedBalance = blockchainService.formatUnits(balance);

    res.json({
      id: wallet.id,
      address: wallet.address,
      type: wallet.type,
      status: wallet.status,
      balance: formattedBalance,
      balanceWei: balance.toString(),
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/account/wallets/:address/tokens
 * Get token balances for user wallet
 */
router.get('/:address/tokens', async (req, res) => {
  try {
    const userId = getUserFromRequest(req);
    const { address } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const wallet = await walletService.getWallet(address);

    if (!wallet || wallet.userId !== userId) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Get VC token balances (would need to know token addresses)
    // For now, return placeholder
    res.json({
      address,
      tokens: [],
      message: 'Token balance fetching not yet implemented',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/account/wallets/:address/transactions
 * Get user wallet transaction history
 */
router.get('/:address/transactions', async (req, res) => {
  try {
    const userId = getUserFromRequest(req);
    const { address } = req.params;
    const { limit = 50 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const wallet = await walletService.getWallet(address);

    if (!wallet || wallet.userId !== userId) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Get transactions for this wallet
    const transactions = await hotWalletService.getTransactionHistory(Number(limit));

    res.json({
      address,
      transactions: transactions.filter(tx => 
        tx.toAddress === address || tx.toAddress === wallet.address
      ),
      total: transactions.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

