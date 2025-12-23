import { KYCService } from '../../src/services/KYCService';
import { createTestUser } from '../helpers/testHelpers';
import { prisma } from '../setup';

describe('KYCService', () => {
  describe('uploadDocument', () => {
    it('should upload a KYC document', async () => {
      const user = await createTestUser();

      const document = await KYCService.uploadDocument({
        userId: user.id,
        documentType: 'passport',
        documentUrl: 'https://example.com/passport.pdf',
      });

      expect(document).toHaveProperty('id');
      expect(document).toHaveProperty('documentType', 'passport');
      expect(document).toHaveProperty('status', 'pending');
      expect(document).toHaveProperty('userId', user.id);
    });

    it('should reject invalid document type', async () => {
      const user = await createTestUser();

      await expect(
        KYCService.uploadDocument({
          userId: user.id,
          documentType: 'invalid_type' as any,
          documentUrl: 'https://example.com/doc.pdf',
        })
      ).rejects.toThrow();
    });
  });

  describe('verifyDocument', () => {
    it('should verify a document', async () => {
      const user = await createTestUser();
      const document = await prisma.kYCDocument.create({
        data: {
          userId: user.id,
          documentType: 'passport',
          documentUrl: 'https://example.com/passport.pdf',
          status: 'pending',
        },
      });

      const verified = await KYCService.verifyDocument({
        documentId: document.id,
        status: 'verified',
        verifiedBy: 'admin-user-id',
      });

      expect(verified).toHaveProperty('status', 'verified');
      expect(verified).toHaveProperty('verifiedAt');
      expect(verified).toHaveProperty('verifiedBy', 'admin-user-id');
    });

    it('should reject a document', async () => {
      const user = await createTestUser();
      const document = await prisma.kYCDocument.create({
        data: {
          userId: user.id,
          documentType: 'passport',
          documentUrl: 'https://example.com/passport.pdf',
          status: 'pending',
        },
      });

      const rejected = await KYCService.verifyDocument({
        documentId: document.id,
        status: 'rejected',
        verifiedBy: 'admin-user-id',
        rejectionReason: 'Document quality too low',
      });

      expect(rejected).toHaveProperty('status', 'rejected');
      expect(rejected).toHaveProperty('rejectionReason', 'Document quality too low');
    });
  });

  describe('getKYCStatus', () => {
    it('should get KYC status for user', async () => {
      const user = await createTestUser({ kycLevel: 1, kycStatus: 'verified' });

      const status = await KYCService.getKYCStatus(user.id);

      expect(status).toHaveProperty('kycLevel', 1);
      expect(status).toHaveProperty('kycStatus', 'verified');
      expect(status).toHaveProperty('documents');
    });

    it('should include documents in status', async () => {
      const user = await createTestUser();
      await prisma.kYCDocument.create({
        data: {
          userId: user.id,
          documentType: 'passport',
          documentUrl: 'https://example.com/passport.pdf',
          status: 'pending',
        },
      });

      const status = await KYCService.getKYCStatus(user.id);

      expect(status.documents).toBeInstanceOf(Array);
      expect(status.documents.length).toBeGreaterThan(0);
    });
  });

  describe('updateKYCLevel', () => {
    it('should update KYC level', async () => {
      const user = await createTestUser({ kycLevel: 0 });

      const updated = await KYCService.updateKYCLevel({
        userId: user.id,
        kycLevel: 2,
      });

      expect(updated).toHaveProperty('kycLevel', 2);
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        KYCService.updateKYCLevel({
          userId: 'non-existent-id',
          kycLevel: 2,
        })
      ).rejects.toThrow();
    });
  });

  describe('recordAMLTransaction', () => {
    it('should record AML transaction', async () => {
      const user = await createTestUser();

      const transaction = await KYCService.recordAMLTransaction({
        userId: user.id,
        transactionType: 'investment',
        amount: 1000,
        riskScore: 25,
      });

      expect(transaction).toHaveProperty('id');
      expect(transaction).toHaveProperty('userId', user.id);
      expect(transaction).toHaveProperty('riskScore', 25);
      expect(transaction).toHaveProperty('flagged', false);
    });

    it('should flag high-risk transactions', async () => {
      const user = await createTestUser();

      const transaction = await KYCService.recordAMLTransaction({
        userId: user.id,
        transactionType: 'investment',
        amount: 100000,
        riskScore: 85, // High risk
      });

      expect(transaction).toHaveProperty('flagged', true);
    });
  });
});

