import request from 'supertest';
import app from '../../src/app';
import { 
  createTestUser, 
  createTestVCFund, 
  createTestCurrency, 
  createTestAccount,
  createTestMarket,
  generateToken 
} from '../helpers/testHelpers';
import { prisma } from '../setup';

describe('End-to-End User Flows', () => {
  describe('Complete Investment Flow', () => {
    it('should complete full investment flow: register → KYC → invest → trade', async () => {
      // Step 1: Register user
      const email = `test-${Date.now()}@example.com`;
      const registerResponse = await request(app)
        .post('/api/v2/public/auth/register')
        .send({
          email,
          password: 'password123',
        })
        .expect(201);

      const token = registerResponse.body.token;
      const userId = registerResponse.body.user.id;

      // Step 2: Upload KYC document
      await request(app)
        .post('/api/v2/account/kyc/documents')
        .set('Authorization', `Bearer ${token}`)
        .send({
          documentType: 'passport',
          documentUrl: 'https://example.com/passport.pdf',
        })
        .expect(201);

      // Step 3: Admin verifies KYC (simulate)
      const admin = await createTestUser({ role: 'admin' });
      const adminToken = generateToken(admin.id, admin.role);

      const documents = await prisma.kYCDocument.findMany({
        where: { userId },
      });

      if (documents.length > 0) {
        await request(app)
          .patch(`/api/v2/admin/kyc/documents/${documents[0].id}/verify`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ verified: true })
          .expect(200);

        // Update KYC level
        await request(app)
          .patch(`/api/v2/admin/kyc/users/${userId}/kyc-level`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ kycLevel: 1 })
          .expect(200);
      }

      // Step 4: Create currencies and fund
      const quoteCurrency = await createTestCurrency({ code: 'USDT', name: 'Tether' });
      const baseCurrency = await createTestCurrency({ code: 'VC_TOKEN', name: 'VC Token', type: 'vc_token' });
      const vcFund = await createTestVCFund({ currencyId: baseCurrency.id });

      // Step 5: Add balance to user account
      await createTestAccount(userId, quoteCurrency.id, 10000);

      // Step 6: Create token offering
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

      // Step 7: Purchase tokens
      const purchaseResponse = await request(app)
        .post(`/api/v2/account/token_offerings/${offering.id}/purchase`)
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 1000 })
        .expect(200);

      expect(purchaseResponse.body).toHaveProperty('allocation');
      expect(purchaseResponse.body.allocation).toHaveProperty('purchasedTokens');

      // Step 8: Create market
      const market = await createTestMarket(baseCurrency.id, quoteCurrency.id);

      // Step 9: Create sell order
      const orderResponse = await request(app)
        .post('/api/v2/account/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          market_id: market.id,
          side: 'sell',
          ord_type: 'limit',
          price: 1.5,
          volume: 100,
        })
        .expect(201);

      expect(orderResponse.body).toHaveProperty('id');
      expect(orderResponse.body).toHaveProperty('side', 'sell');

      // Step 10: Check portfolio
      const portfolioResponse = await request(app)
        .get('/api/v2/account/portfolio')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(portfolioResponse.body).toHaveProperty('investments');
      expect(portfolioResponse.body.investments.length).toBeGreaterThan(0);
    });
  });

  describe('Admin Fund Management Flow', () => {
    it('should complete admin fund management flow', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const adminToken = generateToken(admin.id, admin.role);

      // Step 1: Create currency
      const currency = await createTestCurrency({ code: 'VC_TOKEN', type: 'vc_token' });

      // Step 2: Create VC fund
      const fundResponse = await request(app)
        .post('/api/v2/admin/vc_funds')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          id: `test-fund-${Date.now()}`,
          name: 'New VC Fund',
          description: 'Test description',
          manager: 'Test Manager',
          totalSupply: 1000000,
          availableSupply: 500000,
          fundSize: 10000000,
          minimumInvestment: 1000,
          launchDate: '2024-01-01',
          maturityDate: '2034-01-01',
          status: 'active',
          riskLevel: 'medium',
          regulatoryStatus: 'approved',
          currentNav: 1.0,
          tokensAvailablePercentage: 50,
          currencyId: currency.id,
        })
        .expect(201);

      const fundId = fundResponse.body.fund.id;

      // Step 3: Update NAV
      const navResponse = await request(app)
        .patch(`/api/v2/admin/vc_funds/${fundId}/nav`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nav: 1.5 })
        .expect(200);

      expect(navResponse.body.fund).toHaveProperty('currentNav', 1.5);

      // Step 4: Create token offering
      const offeringResponse = await request(app)
        .post('/api/v2/admin/token_offerings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          vcFundId: fundId,
          offeringType: 'initial',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          offeringPrice: 1.0,
          minInvestment: 100,
          maxInvestment: 10000,
          totalTokensOffered: 100000,
          currencyId: currency.id,
        })
        .expect(201);

      expect(offeringResponse.body.offering).toHaveProperty('id');
      expect(offeringResponse.body.offering).toHaveProperty('vcFundId', fundId);
    });
  });
});

