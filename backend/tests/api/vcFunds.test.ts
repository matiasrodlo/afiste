import request from 'supertest';
import app from '../../src/app';
import { createTestUser, createTestVCFund, generateToken } from '../helpers/testHelpers';

describe('VC Funds API', () => {
  describe('GET /api/v2/public/vc_funds', () => {
    it('should list VC funds', async () => {
      await createTestVCFund();
      await createTestVCFund({ name: 'Second Fund' });

      const response = await request(app)
        .get('/api/v2/public/vc_funds')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      await createTestVCFund({ status: 'active' });
      await createTestVCFund({ status: 'closed', name: 'Closed Fund' });

      const response = await request(app)
        .get('/api/v2/public/vc_funds?status=active')
        .expect(200);

      expect(response.body.data.every((fund: any) => fund.status === 'active')).toBe(true);
    });

    it('should paginate results', async () => {
      // Create multiple funds
      for (let i = 0; i < 5; i++) {
        await createTestVCFund({ name: `Fund ${i}` });
      }

      const response = await request(app)
        .get('/api/v2/public/vc_funds?page=1&limit=2')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 2);
    });
  });

  describe('GET /api/v2/public/vc_funds/:id', () => {
    it('should get fund details', async () => {
      const fund = await createTestVCFund();

      const response = await request(app)
        .get(`/api/v2/public/vc_funds/${fund.id}`)
        .expect(200);

      expect(response.body.fund).toHaveProperty('id', fund.id);
      expect(response.body.fund).toHaveProperty('name', fund.name);
    });

    it('should return 404 for non-existent fund', async () => {
      await request(app)
        .get('/api/v2/public/vc_funds/non-existent-id')
        .expect(404);
    });
  });

  describe('POST /api/v2/admin/vc_funds', () => {
    it('should create VC fund as admin', async () => {
      const admin = await createTestUser({ role: 'admin' });
      const token = generateToken(admin.id, admin.role);

      const fundData = {
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
      };

      const response = await request(app)
        .post('/api/v2/admin/vc_funds')
        .set('Authorization', `Bearer ${token}`)
        .send(fundData)
        .expect(201);

      expect(response.body.fund).toHaveProperty('id');
      expect(response.body.fund).toHaveProperty('name', fundData.name);
    });

    it('should reject non-admin users', async () => {
      const user = await createTestUser({ role: 'investor' });
      const token = generateToken(user.id, user.role);

      await request(app)
        .post('/api/v2/admin/vc_funds')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Fund' })
        .expect(403);
    });
  });
});

