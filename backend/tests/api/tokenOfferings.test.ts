import request from 'supertest';
import app from '../../src/app';
import { 
  createTestUser, 
  createTestVCFund, 
  createTestCurrency, 
  createTestAccount,
  generateToken 
} from '../helpers/testHelpers';
import { prisma } from '../setup';

describe('Token Offerings API', () => {
  let user: any;
  let admin: any;
  let vcFund: any;
  let quoteCurrency: any;
  let userToken: string;
  let adminToken: string;

  beforeEach(async () => {
    // Create test user and admin
    user = await createTestUser({ kycLevel: 1, kycStatus: 'verified' });
    admin = await createTestUser({ role: 'admin' });
    userToken = generateToken(user.id, user.role);
    adminToken = generateToken(admin.id, admin.role);

    // Create currency
    quoteCurrency = await createTestCurrency({ code: 'USDT', name: 'Tether' });
    const baseCurrency = await createTestCurrency({ code: 'VC_TOKEN', name: 'VC Token', type: 'vc_token' });

    // Create VC fund
    vcFund = await createTestVCFund({ currencyId: baseCurrency.id });

    // Create user account with balance
    await createTestAccount(user.id, quoteCurrency.id, 10000);
  });

  describe('GET /api/v2/public/token_offerings', () => {
    it('should list active token offerings', async () => {
      // Create an offering
      await prisma.tokenOffering.create({
        data: {
          vcFundId: vcFund.id,
          offeringType: 'initial',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          offeringPrice: 1.0,
          minInvestment: 100,
          maxInvestment: 10000,
          totalTokensOffered: 100000,
          tokensSold: 0,
          status: 'active',
          currencyId: quoteCurrency.id,
        },
      });

      const response = await request(app)
        .get('/api/v2/public/token_offerings')
        .expect(200);

      expect(response.body.offerings).toBeInstanceOf(Array);
      expect(response.body.offerings.length).toBeGreaterThan(0);
    });

    it('should filter offerings by status', async () => {
      const response = await request(app)
        .get('/api/v2/public/token_offerings?status=active')
        .expect(200);

      expect(response.body.offerings).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v2/public/token_offerings/:id', () => {
    it('should get offering details', async () => {
      const offering = await prisma.tokenOffering.create({
        data: {
          vcFundId: vcFund.id,
          offeringType: 'initial',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          offeringPrice: 1.0,
          minInvestment: 100,
          maxInvestment: 10000,
          totalTokensOffered: 100000,
          tokensSold: 0,
          status: 'active',
          currencyId: quoteCurrency.id,
        },
      });

      const response = await request(app)
        .get(`/api/v2/public/token_offerings/${offering.id}`)
        .expect(200);

      expect(response.body.offering).toHaveProperty('id', offering.id);
      expect(response.body.offering).toHaveProperty('vcFundId', vcFund.id);
    });

    it('should return 404 for non-existent offering', async () => {
      await request(app)
        .get('/api/v2/public/token_offerings/non-existent-id')
        .expect(404);
    });
  });

  describe('POST /api/v2/account/token_offerings/:id/purchase', () => {
    it('should purchase tokens from offering', async () => {
      const offering = await prisma.tokenOffering.create({
        data: {
          vcFundId: vcFund.id,
          offeringType: 'initial',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          offeringPrice: 1.0,
          minInvestment: 100,
          maxInvestment: 10000,
          totalTokensOffered: 100000,
          tokensSold: 0,
          status: 'active',
          currencyId: quoteCurrency.id,
        },
      });

      const purchaseData = {
        amount: 1000,
      };

      const response = await request(app)
        .post(`/api/v2/account/token_offerings/${offering.id}/purchase`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(purchaseData)
        .expect(200);

      expect(response.body).toHaveProperty('allocation');
      expect(response.body.allocation).toHaveProperty('purchasedTokens');
      expect(Number(response.body.allocation.purchasedTokens)).toBe(1000);
    });

    it('should reject purchase below minimum investment', async () => {
      const offering = await prisma.tokenOffering.create({
        data: {
          vcFundId: vcFund.id,
          offeringType: 'initial',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          offeringPrice: 1.0,
          minInvestment: 100,
          maxInvestment: 10000,
          totalTokensOffered: 100000,
          tokensSold: 0,
          status: 'active',
          currencyId: quoteCurrency.id,
        },
      });

      await request(app)
        .post(`/api/v2/account/token_offerings/${offering.id}/purchase`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ amount: 50 }) // Below minimum
        .expect(400);
    });

    it('should reject purchase without KYC verification', async () => {
      const unverifiedUser = await createTestUser({ kycLevel: 0, kycStatus: 'pending' });
      const unverifiedToken = generateToken(unverifiedUser.id, unverifiedUser.role);

      const offering = await prisma.tokenOffering.create({
        data: {
          vcFundId: vcFund.id,
          offeringType: 'initial',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          offeringPrice: 1.0,
          minInvestment: 100,
          maxInvestment: 10000,
          totalTokensOffered: 100000,
          tokensSold: 0,
          status: 'active',
          currencyId: quoteCurrency.id,
        },
      });

      await request(app)
        .post(`/api/v2/account/token_offerings/${offering.id}/purchase`)
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send({ amount: 1000 })
        .expect(403);
    });

    it('should reject purchase without sufficient balance', async () => {
      const poorUser = await createTestUser({ kycLevel: 1, kycStatus: 'verified' });
      const poorToken = generateToken(poorUser.id, poorUser.role);

      // Create account with low balance
      await createTestAccount(poorUser.id, quoteCurrency.id, 10);

      const offering = await prisma.tokenOffering.create({
        data: {
          vcFundId: vcFund.id,
          offeringType: 'initial',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          offeringPrice: 1.0,
          minInvestment: 100,
          maxInvestment: 10000,
          totalTokensOffered: 100000,
          tokensSold: 0,
          status: 'active',
          currencyId: quoteCurrency.id,
        },
      });

      await request(app)
        .post(`/api/v2/account/token_offerings/${offering.id}/purchase`)
        .set('Authorization', `Bearer ${poorToken}`)
        .send({ amount: 1000 })
        .expect(400);
    });
  });

  describe('POST /api/v2/admin/token_offerings', () => {
    it('should create token offering as admin', async () => {
      const offeringData = {
        vcFundId: vcFund.id,
        offeringType: 'initial',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        offeringPrice: 1.0,
        minInvestment: 100,
        maxInvestment: 10000,
        totalTokensOffered: 100000,
        currencyId: quoteCurrency.id,
      };

      const response = await request(app)
        .post('/api/v2/admin/token_offerings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(offeringData)
        .expect(201);

      expect(response.body.offering).toHaveProperty('id');
      expect(response.body.offering).toHaveProperty('vcFundId', vcFund.id);
    });

    it('should reject non-admin users', async () => {
      const offeringData = {
        vcFundId: vcFund.id,
        offeringType: 'initial',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        offeringPrice: 1.0,
        minInvestment: 100,
        maxInvestment: 10000,
        totalTokensOffered: 100000,
        currencyId: quoteCurrency.id,
      };

      await request(app)
        .post('/api/v2/admin/token_offerings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(offeringData)
        .expect(403);
    });
  });
});

