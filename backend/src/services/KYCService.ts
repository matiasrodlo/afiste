import prisma from '../config/database';
import { Prisma } from '@prisma/client';

export interface UploadDocumentParams {
  userId: string;
  documentType: string;
  documentUrl: string;
}

export interface VerifyDocumentParams {
  documentId: string;
  verifiedBy: string;
  status: 'verified' | 'rejected';
  rejectionReason?: string;
}

export interface UpdateKYCLevelParams {
  userId: string;
  kycLevel: number;
  kycStatus: string;
  verifiedBy: string;
  notes?: string;
}

export class KYCService {
  // Upload a KYC document for verification
  static async uploadDocument(params: UploadDocumentParams) {
    const document = await prisma.kYCDocument.create({
      data: {
        userId: params.userId,
        documentType: params.documentType,
        documentUrl: params.documentUrl,
        status: 'pending',
      },
    });

    return document;
  }

  // Verify or reject a KYC document
  static async verifyDocument(params: VerifyDocumentParams) {
    const document = await prisma.kYCDocument.update({
      where: { id: params.documentId },
      data: {
        status: params.status,
        verifiedBy: params.verifiedBy,
        verifiedAt: params.status === 'verified' ? new Date() : null,
        rejectionReason: params.rejectionReason,
      },
    });

    // If document is verified, check if user should be upgraded
    if (params.status === 'verified') {
      await this.checkAndUpdateKYCLevel(document.userId);
    }

    return document;
  }

  // Auto-update KYC level if user has enough verified docs
  static async checkAndUpdateKYCLevel(userId: string) {
    const documents = await prisma.kYCDocument.findMany({
      where: {
        userId,
        status: 'verified',
      },
    });

    const documentTypes = documents.map((d) => d.documentType);
    let newKYCLevel = 0;
    let newKYCStatus = 'pending';

    // Level 1: Basic verification (email + one document)
    if (documentTypes.includes('passport') || documentTypes.includes('id_card')) {
      newKYCLevel = 1;
      newKYCStatus = 'verified';
    }

    // Level 2: Enhanced verification (ID + proof of address)
    if (
      (documentTypes.includes('passport') || documentTypes.includes('id_card')) &&
      documentTypes.includes('proof_of_address')
    ) {
      newKYCLevel = 2;
      newKYCStatus = 'verified';
    }

    // Level 3: Full verification (all documents + accreditation)
    if (
      (documentTypes.includes('passport') || documentTypes.includes('id_card')) &&
      documentTypes.includes('proof_of_address') &&
      documentTypes.includes('accreditation')
    ) {
      newKYCLevel = 3;
      newKYCStatus = 'verified';
    }

    // Update user KYC
    if (newKYCLevel > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          kycLevel: newKYCLevel,
          kycStatus: newKYCStatus,
          kycVerifiedAt: new Date(),
        },
      });
    }

    return { kycLevel: newKYCLevel, kycStatus: newKYCStatus };
  }

  /**
   * Get user KYC documents
   */
  static async getUserDocuments(userId: string) {
    return await prisma.kYCDocument.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get user KYC status
   */
  static async getUserKYCStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        kycLevel: true,
        kycStatus: true,
        kycVerifiedAt: true,
        kycNotes: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const documents = await this.getUserDocuments(userId);

    return {
      ...user,
      documents,
    };
  }

  /**
   * Update KYC level manually (admin function)
   */
  static async updateKYCLevel(params: UpdateKYCLevelParams) {
    return await prisma.user.update({
      where: { id: params.userId },
      data: {
        kycLevel: params.kycLevel,
        kycStatus: params.kycStatus,
        kycVerifiedAt: params.kycStatus === 'verified' ? new Date() : null,
        kycNotes: params.notes,
      },
    });
  }

  /**
   * Record AML transaction
   */
  static async recordAMLTransaction(params: {
    userId: string;
    transactionType: string;
    amount: number;
    currency: string;
    riskScore?: number;
  }) {
    // Validate amount
    if (!params.amount || isNaN(params.amount) || params.amount <= 0) {
      console.error(`Invalid amount for AML transaction: ${params.amount}`);
      throw new Error(`Invalid amount for AML transaction: ${params.amount}`);
    }

    // Simple risk scoring (can be enhanced)
    const riskScore = params.riskScore || this.calculateRiskScore(params.amount);

    try {
      const amlTransaction = await prisma.aMLTransaction.create({
        data: {
          userId: params.userId,
          transactionType: params.transactionType,
          amount: new Prisma.Decimal(params.amount), // Ensure it's a Decimal
          currency: params.currency,
          riskScore,
          flagged: riskScore >= 70,
          reviewStatus: riskScore >= 70 ? 'pending' : 'cleared',
        },
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(`AML transaction created: ${amlTransaction.id} for user ${params.userId}, amount: ${params.amount} ${params.currency}`);
      }
      return amlTransaction;
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Failed to create AML transaction for user ${params.userId}:`, error);
      }
      throw error;
    }
  }

  /**
   * Calculate risk score (simple implementation)
   */
  private static calculateRiskScore(amount: number): number {
    // Simple risk scoring based on amount
    if (amount < 1000) return 10;
    if (amount < 10000) return 30;
    if (amount < 100000) return 50;
    if (amount < 1000000) return 70;
    return 90; // Very high risk for amounts > 1M
  }

  /**
   * Review AML transaction
   */
  static async reviewAMLTransaction(
    transactionId: string,
    reviewedBy: string,
    reviewStatus: 'cleared' | 'blocked',
    notes?: string
  ) {
    return await prisma.aMLTransaction.update({
      where: { id: transactionId },
      data: {
        reviewStatus,
        reviewedBy,
        reviewedAt: new Date(),
        notes,
      },
    });
  }
}

