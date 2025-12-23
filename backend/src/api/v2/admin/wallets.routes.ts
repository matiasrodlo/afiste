import { Router } from 'express';
import { getWalletService, WalletType } from '../../../services/wallet/WalletService';
import { getHotWalletService } from '../../../services/wallet/HotWalletService';
import { getMultiSigWalletService } from '../../../services/wallet/MultiSigWalletService';
import { getKeyRotationService } from '../../../services/wallet/KeyRotationService';
import { getBlockchainService } from '../../../services/blockchain/BlockchainService';
import prisma from '../../../config/database';

const router = Router();
const walletService = getWalletService();
const hotWalletService = getHotWalletService();
const multiSigService = getMultiSigWalletService();
const keyRotationService = getKeyRotationService();
const blockchainService = getBlockchainService();

/**
 * GET /api/v2/admin/wallets
 * List all platform wallets
 */
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const wallets = await walletService.getPlatformWallets(
      type ? (type as WalletType) : undefined
    );

    res.json({
      wallets: wallets.map(w => ({
        id: w.id,
        address: w.address,
        type: w.type,
        status: w.status,
        isMultiSig: w.isMultiSig,
        threshold: w.threshold,
        owners: w.owners,
        createdAt: w.createdAt,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/admin/wallets/:address
 * Get wallet details
 */
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const wallet = await walletService.getWallet(address);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const balance = await walletService.getBalance(address);
    const formattedBalance = blockchainService.formatUnits(balance);

    res.json({
      id: wallet.id,
      address: wallet.address,
      type: wallet.type,
      status: wallet.status,
      isMultiSig: wallet.isMultiSig,
      threshold: wallet.threshold,
      owners: wallet.owners,
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
 * POST /api/v2/admin/wallets
 * Create a new platform wallet
 */
router.post('/', async (req, res) => {
  try {
    const { type, isMultiSig, owners, threshold } = req.body;

    if (!type || (type !== 'hot' && type !== 'cold')) {
      return res.status(400).json({ error: 'Invalid wallet type' });
    }

    const wallet = await walletService.createWallet(
      type as WalletType,
      undefined,
      isMultiSig || false
    );

    // Set owners and threshold if multi-sig
    if (isMultiSig && owners && threshold) {
      await prisma.wallet.update({
        where: { address: wallet.address },
        data: {
          owners: owners,
          threshold: threshold,
        },
      });
    }

    res.json({
      id: wallet.id,
      address: wallet.address,
      type: wallet.type,
      status: wallet.status,
      isMultiSig: wallet.isMultiSig,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/admin/wallets/:address/freeze
 * Freeze a wallet
 */
router.post('/:address/freeze', async (req, res) => {
  try {
    const { address } = req.params;
    await walletService.freezeWallet(address);

    res.json({
      message: 'Wallet frozen',
      address,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/admin/wallets/:address/unfreeze
 * Unfreeze a wallet
 */
router.post('/:address/unfreeze', async (req, res) => {
  try {
    const { address } = req.params;
    await walletService.unfreezeWallet(address);

    res.json({
      message: 'Wallet unfrozen',
      address,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/admin/wallets/:address/transactions
 * Get wallet transaction history
 */
router.get('/:address/transactions', async (req, res) => {
  try {
    const { address } = req.params;
    const { limit = 50 } = req.query;

    const transactions = await hotWalletService.getTransactionHistory(Number(limit));

    res.json({
      transactions,
      total: transactions.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/admin/wallets/:address/proposals
 * Get pending multi-sig proposals
 */
router.get('/:address/proposals', async (req, res) => {
  try {
    const { address } = req.params;
    const proposals = await multiSigService.getPendingProposals(address);

    res.json({
      proposals,
      total: proposals.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/admin/wallets/:address/proposals/:proposalId/approve
 * Approve a multi-sig proposal
 */
router.post('/:address/proposals/:proposalId/approve', async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { approverAddress } = req.body;

    if (!approverAddress) {
      return res.status(400).json({ error: 'approverAddress is required' });
    }

    const approved = await multiSigService.approveProposal(proposalId, approverAddress);

    if (!approved) {
      return res.status(400).json({ error: 'Proposal already approved by this address' });
    }

    res.json({
      message: 'Proposal approved',
      proposalId,
      approverAddress,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/admin/wallets/:address/proposals/:proposalId/execute
 * Execute a multi-sig proposal
 */
router.post('/:address/proposals/:proposalId/execute', async (req, res) => {
  try {
    const { proposalId } = req.params;
    const txId = await multiSigService.executeProposal(proposalId);

    res.json({
      message: 'Proposal executed',
      proposalId,
      transactionId: txId,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/admin/wallets/:address/proposals/:proposalId/cancel
 * Cancel a multi-sig proposal
 */
router.post('/:address/proposals/:proposalId/cancel', async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { cancellerAddress } = req.body;

    if (!cancellerAddress) {
      return res.status(400).json({ error: 'cancellerAddress is required' });
    }

    const cancelled = await multiSigService.cancelProposal(proposalId, cancellerAddress);

    if (!cancelled) {
      return res.status(400).json({ error: 'Failed to cancel proposal' });
    }

    res.json({
      message: 'Proposal cancelled',
      proposalId,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/admin/wallets/approvals/pending
 * Get all proposals requiring approval
 */
router.get('/approvals/pending', async (req, res) => {
  try {
    const { approverAddress } = req.query;

    if (!approverAddress) {
      return res.status(400).json({ error: 'approverAddress is required' });
    }

    const proposals = await multiSigService.getProposalsRequiringApproval(
      approverAddress as string
    );

    res.json({
      proposals,
      total: proposals.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/admin/wallets/:address/rotate-key
 * Rotate wallet encryption key
 */
router.post('/:address/rotate-key', async (req, res) => {
  try {
    const { address } = req.params;
    const { newEncryptionKey } = req.body;

    if (!newEncryptionKey) {
      return res.status(400).json({ error: 'newEncryptionKey is required' });
    }

    await keyRotationService.rotateEncryptionKey(address, newEncryptionKey);

    res.json({
      message: 'Encryption key rotated',
      address,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/admin/wallets/rotation/required
 * Get wallets requiring key rotation
 */
router.get('/rotation/required', async (req, res) => {
  try {
    const { daysSinceRotation = 90 } = req.query;
    const addresses = await keyRotationService.getWalletsRequiringRotation(
      Number(daysSinceRotation)
    );

    res.json({
      wallets: addresses,
      total: addresses.length,
      daysSinceRotation: Number(daysSinceRotation),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

