import request from 'supertest';
import app from '../../src/app';
import { createTestUser, generateToken } from '../helpers/testHelpers';
import { prisma } from '../setup';

describe('KYC API', () => {
  let user: any;
  let admin: any;
  let userToken: string;
  let adminToken: string;

  beforeEach(async () => {
    user = await createTestUser();
    admin = await createTestUser({ role: 'admin' });
    userToken = generateToken(user.id, user.role);
    adminToken = generateToken(admin.id, admin.role);
  });

  describe('POST /api/v2/account/kyc/documents', () => {
    it('should upload KYC document', async () => {
      const documentData = {
        documentType: 'passport',
        documentUrl: 'https://example.com/passport.pdf',
      };

      const response = await request(app)
        .post('/api/v2/account/kyc/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send(documentData)
        .expect(201);

      expect(response.body.document).toHaveProperty('id');
      expect(response.body.document).toHaveProperty('documentType', 'passport');
      expect(response.body.document).toHaveProperty('status', 'pending');
    });

    it('should reject invalid document type', async () => {
      const documentData = {
        documentType: 'invalid_type',
        documentUrl: 'https://example.com/doc.pdf',
      };

      await request(app)
        .post('/api/v2/account/kyc/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send(documentData)
        .expect(400);
    });

    it('should reject without authentication', async () => {
      const documentData = {
        documentType: 'passport',
        documentUrl: 'https://example.com/passport.pdf',
      };

      await request(app)
        .post('/api/v2/account/kyc/documents')
        .send(documentData)
        .expect(401);
    });
  });

  describe('GET /api/v2/account/kyc/status', () => {
    it('should get KYC status', async () => {
      const response = await request(app)
        .get('/api/v2/account/kyc/status')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('kycLevel');
      expect(response.body).toHaveProperty('kycStatus');
      expect(response.body).toHaveProperty('documents');
    });

    it('should reject without authentication', async () => {
      await request(app)
        .get('/api/v2/account/kyc/status')
        .expect(401);
    });
  });

  describe('GET /api/v2/account/kyc/documents', () => {
    it('should list user documents', async () => {
      // Create a document first
      await prisma.kYCDocument.create({
        data: {
          userId: user.id,
          documentType: 'passport',
          documentUrl: 'https://example.com/passport.pdf',
          status: 'pending',
        },
      });

      const response = await request(app)
        .get('/api/v2/account/kyc/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.documents).toBeInstanceOf(Array);
      expect(response.body.documents.length).toBeGreaterThan(0);
    });
  });

  describe('PATCH /api/v2/admin/kyc/documents/:id/verify', () => {
    it('should verify document as admin', async () => {
      // Create a document
      const document = await prisma.kYCDocument.create({
        data: {
          userId: user.id,
          documentType: 'passport',
          documentUrl: 'https://example.com/passport.pdf',
          status: 'pending',
        },
      });

      const response = await request(app)
        .patch(`/api/v2/admin/kyc/documents/${document.id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ verified: true })
        .expect(200);

      expect(response.body.document).toHaveProperty('status', 'verified');
    });

    it('should reject document as admin', async () => {
      const document = await prisma.kYCDocument.create({
        data: {
          userId: user.id,
          documentType: 'passport',
          documentUrl: 'https://example.com/passport.pdf',
          status: 'pending',
        },
      });

      const response = await request(app)
        .patch(`/api/v2/admin/kyc/documents/${document.id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ 
          verified: false,
          rejectionReason: 'Document quality too low'
        })
        .expect(200);

      expect(response.body.document).toHaveProperty('status', 'rejected');
      expect(response.body.document).toHaveProperty('rejectionReason');
    });

    it('should reject non-admin users', async () => {
      const document = await prisma.kYCDocument.create({
        data: {
          userId: user.id,
          documentType: 'passport',
          documentUrl: 'https://example.com/passport.pdf',
          status: 'pending',
        },
      });

      await request(app)
        .patch(`/api/v2/admin/kyc/documents/${document.id}/verify`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ verified: true })
        .expect(403);
    });
  });

  describe('PATCH /api/v2/admin/kyc/users/:id/kyc-level', () => {
    it('should update KYC level as admin', async () => {
      const response = await request(app)
        .patch(`/api/v2/admin/kyc/users/${user.id}/kyc-level`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ kycLevel: 2 })
        .expect(200);

      expect(response.body.user).toHaveProperty('kycLevel', 2);
    });

    it('should reject non-admin users', async () => {
      await request(app)
        .patch(`/api/v2/admin/kyc/users/${user.id}/kyc-level`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ kycLevel: 2 })
        .expect(403);
    });
  });

  describe('GET /api/v2/admin/kyc/documents/pending', () => {
    it('should list pending documents as admin', async () => {
      // Create pending documents
      await prisma.kYCDocument.create({
        data: {
          userId: user.id,
          documentType: 'passport',
          documentUrl: 'https://example.com/passport.pdf',
          status: 'pending',
        },
      });

      const response = await request(app)
        .get('/api/v2/admin/kyc/documents/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.documents).toBeInstanceOf(Array);
    });

    it('should reject non-admin users', async () => {
      await request(app)
        .get('/api/v2/admin/kyc/documents/pending')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });
});

