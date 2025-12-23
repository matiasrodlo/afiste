import { ethers } from 'ethers';
import { getBlockchainService } from '../blockchain/BlockchainService';
import prisma from '../../config/database';

/**
 * MultiSigWalletService
 * Manages multi-signature wallet operations (Gnosis Safe integration)
 */
export class MultiSigWalletService {
  private blockchainService = getBlockchainService();

  /**
   * Create a multi-sig wallet proposal
   */
  async createProposal(
    walletAddress: string,
    to: string,
    value: bigint,
    data: string,
    description?: string
  ): Promise<string> {
    // Store proposal in database
    const proposal = await prisma.walletTransaction.create({
      data: {
        walletId: (await prisma.wallet.findUnique({ where: { address: walletAddress } }))!.id,
        toAddress: to,
        amount: value.toString(),
        currency: 'ETH',
        type: 'multisig_proposal',
        status: 'pending',
        requiresApproval: true,
        approvals: [],
        metadata: {
          data,
          description: description || '',
          createdAt: new Date().toISOString(),
        },
      },
    });

    return proposal.id;
  }

  /**
   * Approve a multi-sig proposal
   */
  async approveProposal(
    proposalId: string,
    approverAddress: string
  ): Promise<boolean> {
    const proposal = await prisma.walletTransaction.findUnique({
      where: { id: proposalId },
      include: { wallet: true },
    });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (proposal.status !== 'pending') {
      throw new Error('Proposal is not pending');
    }

    // Check if approver is a wallet owner
    const wallet = proposal.wallet;
    if (!wallet.isMultiSig || !wallet.owners?.includes(approverAddress)) {
      throw new Error('Approver is not a wallet owner');
    }

    // Check if already approved
    if (proposal.approvals.includes(approverAddress)) {
      return false; // Already approved
    }

    // Add approval
    const newApprovals = [...proposal.approvals, approverAddress];
    const threshold = wallet.threshold || 1;

    // Check if threshold reached
    const status = newApprovals.length >= threshold ? 'signed' : 'pending';

    await prisma.walletTransaction.update({
      where: { id: proposalId },
      data: {
        approvals: newApprovals,
        status,
      },
    });

    return true;
  }

  /**
   * Execute a multi-sig proposal (after threshold reached)
   */
  async executeProposal(proposalId: string): Promise<string> {
    const proposal = await prisma.walletTransaction.findUnique({
      where: { id: proposalId },
      include: { wallet: true },
    });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (proposal.status !== 'signed') {
      throw new Error('Proposal has not reached approval threshold');
    }

    const wallet = proposal.wallet;

    // In production, this would use Gnosis Safe SDK to execute
    // For now, we'll queue it as a regular transaction
    const { getTransactionQueue } = await import('../blockchain/TransactionQueue');
    const transactionQueue = getTransactionQueue();

    const metadata = proposal.metadata as any;
    const data = metadata?.data || '0x';

    const txId = await transactionQueue.enqueue({
      type: 'multisig_execute',
      contractAddress: wallet.address,
      abi: [], // Gnosis Safe ABI would go here
      functionName: 'execTransaction',
      params: [
        proposal.toAddress,
        proposal.amount.toString(),
        data,
        0, // operation (call)
        0, // safeTxGas
        0, // baseGas
        0, // gasPrice
        '0x0000000000000000000000000000000000000000', // gasToken
        '0x0000000000000000000000000000000000000000', // refundReceiver
        '0x', // signatures
      ],
      value: BigInt(proposal.amount.toString()),
      maxRetries: 3,
      metadata: {
        proposalId,
        walletAddress: wallet.address,
      },
    });

    // Update proposal status
    await prisma.walletTransaction.update({
      where: { id: proposalId },
      data: {
        status: 'broadcast',
        metadata: {
          ...metadata,
          transactionQueueId: txId,
        },
      },
    });

    return txId;
  }

  /**
   * Get pending proposals for a wallet
   */
  async getPendingProposals(walletAddress: string): Promise<any[]> {
    const wallet = await prisma.wallet.findUnique({
      where: { address: walletAddress },
    });

    if (!wallet) {
      return [];
    }

    const proposals = await prisma.walletTransaction.findMany({
      where: {
        walletId: wallet.id,
        type: 'multisig_proposal',
        status: { in: ['pending', 'signed'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    return proposals.map(p => ({
      id: p.id,
      toAddress: p.toAddress,
      amount: p.amount.toString(),
      approvals: p.approvals,
      threshold: wallet.threshold,
      status: p.status,
      createdAt: p.createdAt,
      metadata: p.metadata,
    }));
  }

  /**
   * Get proposals requiring approval from a specific address
   */
  async getProposalsRequiringApproval(approverAddress: string): Promise<any[]> {
    const wallets = await prisma.wallet.findMany({
      where: {
        isMultiSig: true,
        owners: { has: approverAddress },
      },
    });

    const walletIds = wallets.map(w => w.id);

    const proposals = await prisma.walletTransaction.findMany({
      where: {
        walletId: { in: walletIds },
        type: 'multisig_proposal',
        status: 'pending',
      },
      include: { wallet: true },
      orderBy: { createdAt: 'desc' },
    });

    // Filter proposals that don't have this approver's approval yet
    const filteredProposals = proposals.filter(p => {
      if (!p.wallet) return false;
      const approvals = p.approvals || [];
      return !approvals.includes(approverAddress);
    });

    return filteredProposals.map(p => ({
        id: p.id,
      walletAddress: p.wallet!.address,
        toAddress: p.toAddress,
        amount: p.amount.toString(),
        approvals: p.approvals,
      threshold: p.wallet!.threshold || 0,
        createdAt: p.createdAt,
        metadata: p.metadata,
      }));
  }

  /**
   * Cancel a proposal
   */
  async cancelProposal(proposalId: string, cancellerAddress: string): Promise<boolean> {
    const proposal = await prisma.walletTransaction.findUnique({
      where: { id: proposalId },
      include: { wallet: true },
    });

    if (!proposal) {
      return false;
    }

    // Check if canceller is a wallet owner
    const wallet = proposal.wallet;
    if (!wallet.owners?.includes(cancellerAddress)) {
      throw new Error('Only wallet owners can cancel proposals');
    }

    // Only allow cancellation if not executed
    if (proposal.status === 'confirmed' || proposal.status === 'broadcast') {
      throw new Error('Cannot cancel executed proposal');
    }

    await prisma.walletTransaction.update({
      where: { id: proposalId },
      data: {
        status: 'cancelled',
        metadata: {
          ...(proposal.metadata as any),
          cancelledBy: cancellerAddress,
          cancelledAt: new Date().toISOString(),
        },
      },
    });

    return true;
  }
}

// Singleton instance
let multiSigWalletServiceInstance: MultiSigWalletService | null = null;

export const getMultiSigWalletService = (): MultiSigWalletService => {
  if (!multiSigWalletServiceInstance) {
    multiSigWalletServiceInstance = new MultiSigWalletService();
  }
  return multiSigWalletServiceInstance;
};

