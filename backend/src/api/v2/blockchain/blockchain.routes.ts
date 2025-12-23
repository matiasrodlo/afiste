import { Router } from 'express';
import { getBlockchainService } from '../../../services/blockchain/BlockchainService';
import { getTransactionQueue, TransactionStatus } from '../../../services/blockchain/TransactionQueue';
import { getTransactionMonitor } from '../../../services/blockchain/TransactionMonitor';
import { getBlockchainSyncService } from '../../../services/blockchain/BlockchainSyncService';
import { VCTokenService } from '../../../services/blockchain/VCTokenService';
import { TokenOfferingService } from '../../../services/blockchain/TokenOfferingService';
import { blockchainConfig } from '../../../config/blockchain';
import prisma from '../../../config/database';

const router = Router();
const blockchainService = getBlockchainService();
const transactionQueue = getTransactionQueue();
const transactionMonitor = getTransactionMonitor();
const syncService = getBlockchainSyncService();

/**
 * GET /api/v2/blockchain/status
 * Get blockchain network status
 */
router.get('/status', async (req, res) => {
  try {
    const network = await blockchainService.getNetwork();
    const blockNumber = await blockchainService.getBlockNumber();

    res.json({
      network: blockchainConfig.network,
      chainId: Number(network.chainId),
      blockNumber,
      rpcUrl: blockchainConfig.rpcUrl,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/blockchain/balance/:address
 * Get balance of an address
 */
router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const balance = await blockchainService.getBalance(address);
    const formatted = blockchainService.formatUnits(balance);

    res.json({
      address,
      balance: formatted,
      balanceWei: balance.toString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/blockchain/transaction/:txHash
 * Get transaction status
 */
router.get('/transaction/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;

    // Check in queue first
    const queueItem = transactionQueue.getAllTransactions().find(
      tx => tx.txHash === txHash
    );

    if (queueItem) {
      return res.json({
        txHash,
        status: queueItem.status,
        blockNumber: queueItem.blockNumber,
        error: queueItem.error,
        createdAt: queueItem.createdAt,
        updatedAt: queueItem.updatedAt,
      });
    }

    // Check on blockchain
    const status = await transactionMonitor.getTransactionStatus(txHash);

    res.json({
      txHash,
      ...status,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/blockchain/transactions
 * Get all transactions from queue
 */
router.get('/transactions', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    let transactions = transactionQueue.getAllTransactions();

    if (status) {
      transactions = transactions.filter(tx => tx.status === status as TransactionStatus);
    }

    transactions = transactions
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, Number(limit));

    res.json({
      transactions: transactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        contractAddress: tx.contractAddress,
        functionName: tx.functionName,
        status: tx.status,
        txHash: tx.txHash,
        blockNumber: tx.blockNumber,
        error: tx.error,
        retryCount: tx.retryCount,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
      })),
      total: transactions.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/blockchain/transactions/history
 * Get blockchain transactions from database (historical)
 */
router.get('/transactions/history', async (req, res) => {
  try {
    const { 
      contractAddress, 
      status, 
      fromAddress,
      limit = 50, 
      offset = 0 
    } = req.query;

    const where: any = {};
    if (contractAddress) {
      where.contractAddress = contractAddress as string;
    }
    if (status) {
      where.status = status as string;
    }
    if (fromAddress) {
      where.fromAddress = fromAddress as string;
    }

    const [transactions, total] = await Promise.all([
      prisma.blockchainTransaction.findMany({
        where,
        include: {
          events: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.blockchainTransaction.count({ where }),
    ]);

    res.json({
      transactions: transactions.map(tx => ({
        id: tx.id,
        txHash: tx.txHash,
        contractAddress: tx.contractAddress,
        functionName: tx.functionName,
        fromAddress: tx.fromAddress,
        toAddress: tx.toAddress,
        value: tx.value.toString(),
        gasLimit: tx.gasLimit?.toString(),
        gasPrice: tx.gasPrice?.toString(),
        gasUsed: tx.gasUsed?.toString(),
        status: tx.status,
        blockNumber: tx.blockNumber,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        error: tx.error,
        metadata: tx.metadata,
        events: tx.events.map(evt => ({
          eventName: evt.eventName,
          eventData: evt.eventData,
          blockNumber: evt.blockNumber,
        })),
        createdAt: tx.createdAt.toISOString(),
        updatedAt: tx.updatedAt.toISOString(),
        confirmedAt: tx.confirmedAt?.toISOString(),
      })),
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/blockchain/transactions/fund/:fundId
 * Get blockchain transactions for a specific VC fund
 */
router.get('/transactions/fund/:fundId', async (req, res) => {
  try {
    const { fundId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Find the currency for this fund
    const currency = await prisma.currency.findFirst({
      where: { vcFundId: fundId },
    });

    if (!currency) {
      return res.json({
        transactions: [],
        total: 0,
        limit: Number(limit),
        offset: Number(offset),
      });
    }

    // Get transactions for this fund's contract (if we have the contract address)
    // For now, we'll search by contract address pattern or metadata
    const where: any = {
      OR: [
        { metadata: { path: ['vcFundId'], equals: fundId } },
        { metadata: { path: ['fundId'], equals: fundId } },
      ],
    };

    const [transactions, total] = await Promise.all([
      prisma.blockchainTransaction.findMany({
        where,
        include: {
          events: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.blockchainTransaction.count({ where }),
    ]);

    res.json({
      transactions: transactions.map(tx => ({
        id: tx.id,
        txHash: tx.txHash,
        contractAddress: tx.contractAddress,
        functionName: tx.functionName,
        fromAddress: tx.fromAddress,
        toAddress: tx.toAddress,
        value: tx.value.toString(),
        gasLimit: tx.gasLimit?.toString(),
        gasPrice: tx.gasPrice?.toString(),
        gasUsed: tx.gasUsed?.toString(),
        status: tx.status,
        blockNumber: tx.blockNumber,
        blockHash: tx.blockHash,
        confirmations: tx.confirmations,
        error: tx.error,
        metadata: tx.metadata,
        events: tx.events.map(evt => ({
          eventName: evt.eventName,
          eventData: evt.eventData,
          blockNumber: evt.blockNumber,
        })),
        createdAt: tx.createdAt.toISOString(),
        updatedAt: tx.updatedAt.toISOString(),
        confirmedAt: tx.confirmedAt?.toISOString(),
      })),
      total,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/blockchain/vc-token/:address/balance/:userAddress
 * Get VC token balance for a user
 */
router.get('/vc-token/:address/balance/:userAddress', async (req, res) => {
  try {
    const { address, userAddress } = req.params;
    const vcTokenService = new VCTokenService(address);

    const balance = await vcTokenService.getBalance(userAddress);
    const decimals = await vcTokenService.getDecimals();
    const formatted = blockchainService.formatUnits(balance, decimals);

    res.json({
      address: userAddress,
      tokenAddress: address,
      balance: formatted,
      balanceRaw: balance.toString(),
      decimals,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/blockchain/vc-token/:address/info
 * Get VC token information
 */
router.get('/vc-token/:address/info', async (req, res) => {
  try {
    const { address } = req.params;
    const vcTokenService = new VCTokenService(address);

    const [name, symbol, decimals, totalSupply, restrictionsEnabled] = await Promise.all([
      vcTokenService.getName(),
      vcTokenService.getSymbol(),
      vcTokenService.getDecimals(),
      vcTokenService.getTotalSupply(),
      vcTokenService.areTransferRestrictionsEnabled(),
    ]);

    res.json({
      address,
      name,
      symbol,
      decimals,
      totalSupply: blockchainService.formatUnits(totalSupply, decimals),
      totalSupplyRaw: totalSupply.toString(),
      transferRestrictionsEnabled: restrictionsEnabled,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/blockchain/token-offering/:address/offering/:offeringId
 * Get token offering details
 */
router.get('/token-offering/:address/offering/:offeringId', async (req, res) => {
  try {
    const { address, offeringId } = req.params;
    const tokenOfferingService = new TokenOfferingService(address);

    const offering = await tokenOfferingService.getOffering(BigInt(offeringId));

    res.json({
      offeringId,
      vcToken: offering.vcToken,
      offeringPrice: blockchainService.formatUnits(offering.offeringPrice),
      minInvestment: blockchainService.formatUnits(offering.minInvestment),
      maxInvestment: offering.maxInvestment > 0n
        ? blockchainService.formatUnits(offering.maxInvestment)
        : null,
      totalTokensOffered: blockchainService.formatUnits(offering.totalTokensOffered),
      tokensSold: blockchainService.formatUnits(offering.tokensSold),
      startDate: new Date(Number(offering.startDate) * 1000),
      endDate: offering.endDate > 0n
        ? new Date(Number(offering.endDate) * 1000)
        : null,
      status: offering.status,
      whitelistRequired: offering.whitelistRequired,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/blockchain/sync/status
 * Get blockchain sync status
 */
router.get('/sync/status', async (req, res) => {
  try {
    const status = await syncService.getSyncStatus();
    res.json({ contracts: status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/blockchain/sync/register
 * Register a contract for synchronization
 */
router.post('/sync/register', async (req, res) => {
  try {
    const { contractAddress, contractType } = req.body;

    if (!contractAddress || !contractType) {
      return res.status(400).json({ error: 'contractAddress and contractType are required' });
    }

    if (contractType !== 'VCToken' && contractType !== 'TokenOffering') {
      return res.status(400).json({ error: 'contractType must be VCToken or TokenOffering' });
    }

    await syncService.registerContract(contractAddress, contractType);

    res.json({
      message: 'Contract registered for synchronization',
      contractAddress,
      contractType,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v2/blockchain/sync/trigger
 * Manually trigger synchronization
 */
router.post('/sync/trigger', async (req, res) => {
  try {
    const { contractAddress } = req.body;

    if (contractAddress) {
      // Sync specific contract
      const syncState = await prisma.blockchainSyncState.findUnique({
        where: { contractAddress },
      });

      if (!syncState) {
        return res.status(404).json({ error: 'Contract not registered' });
      }

      await syncService.syncContract(contractAddress, syncState.contractType);
      res.json({ message: 'Sync triggered', contractAddress });
    } else {
      // Sync all contracts
      await syncService.syncAll();
      res.json({ message: 'Sync triggered for all contracts' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

