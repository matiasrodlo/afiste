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

describe('Trading API', () => {
  let user: any;
  let admin: any;
  let baseCurrency: any;
  let quoteCurrency: any;
  let vcFund: any;
  let market: any;
  let userToken: string;
  let adminToken: string;

  beforeEach(async () => {
    // Create test user and admin
    user = await createTestUser();
    admin = await createTestUser({ role: 'admin' });
    userToken = generateToken(user.id, user.role);
    adminToken = generateToken(admin.id, admin.role);

    // Create currencies
    quoteCurrency = await createTestCurrency({ code: 'USDT', name: 'Tether' });
    baseCurrency = await createTestCurrency({ code: 'VC_TOKEN', name: 'VC Token', type: 'vc_token' });

    // Create VC fund
    vcFund = await createTestVCFund({ currencyId: baseCurrency.id });

    // Create market
    market = await createTestMarket(baseCurrency.id, quoteCurrency.id);

    // Create user account with balance
    await createTestAccount(user.id, quoteCurrency.id, 10000);
    await createTestAccount(user.id, baseCurrency.id, 1000);
  });

  describe('POST /api/v2/account/orders', () => {
    it('should create a buy order', async () => {
      const orderData = {
        market_id: market.id,
        side: 'buy',
        ord_type: 'limit',
        price: 1.5,
        volume: 100,
      };

      const response = await request(app)
        .post('/api/v2/account/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('side', 'buy');
      expect(response.body).toHaveProperty('state', 'wait');
    });

    it('should create a sell order', async () => {
      const orderData = {
        marketId: market.id,
        side: 'sell',
        type: 'limit',
        price: 1.5,
        amount: 50,
      };

      const response = await request(app)
        .post('/api/v2/account/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('side', 'sell');
    });

    it('should reject order without sufficient balance', async () => {
      const orderData = {
        market_id: market.id,
        side: 'buy',
        ord_type: 'limit',
        price: 1.5,
        volume: 100000, // More than user has
      };

      await request(app)
        .post('/api/v2/account/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(400);
    });

    it('should reject order without authentication', async () => {
      const orderData = {
        market_id: market.id,
        side: 'buy',
        ord_type: 'limit',
        price: 1.5,
        volume: 100,
      };

      await request(app)
        .post('/api/v2/account/orders')
        .send(orderData)
        .expect(401);
    });

    it('should validate order data', async () => {
      const invalidOrder = {
        market_id: market.id,
        side: 'invalid',
        ord_type: 'limit',
        price: -1,
        volume: 0,
      };

      await request(app)
        .post('/api/v2/account/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidOrder)
        .expect(400);
    });
  });

  describe('GET /api/v2/account/orders', () => {
    it('should list user orders', async () => {
      // Create an order first
      const orderData = {
        market_id: market.id,
        side: 'buy',
        ord_type: 'limit',
        price: 1.5,
        volume: 100,
      };

      await request(app)
        .post('/api/v2/account/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData);

      const response = await request(app)
        .get('/api/v2/account/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.orders).toBeInstanceOf(Array);
      expect(response.body.orders.length).toBeGreaterThan(0);
    });

    it('should filter orders by state', async () => {
      const response = await request(app)
        .get('/api/v2/account/orders?state=wait')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/v2/account/orders/:id/cancel', () => {
    it('should cancel an order', async () => {
      // Create an order first
      const orderData = {
        market_id: market.id,
        side: 'buy',
        ord_type: 'limit',
        price: 1.5,
        volume: 100,
      };

      const createResponse = await request(app)
        .post('/api/v2/account/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData);

      const orderId = createResponse.body.order.id;

      const response = await request(app)
        .post(`/api/v2/account/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.order).toHaveProperty('state', 'cancel');
    });

    it('should reject canceling other user\'s order', async () => {
      // Create order with user
      const orderData = {
        market_id: market.id,
        side: 'buy',
        ord_type: 'limit',
        price: 1.5,
        volume: 100,
      };

      const createResponse = await request(app)
        .post('/api/v2/account/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData);

      const orderId = createResponse.body.order.id;

      // Try to cancel with different user
      const otherUser = await createTestUser();
      const otherToken = generateToken(otherUser.id, otherUser.role);

      await request(app)
        .post(`/api/v2/account/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });

  describe('GET /api/v2/public/order_book/:market', () => {
    it('should get order book for market', async () => {
      // Create some orders first
      await request(app)
        .post('/api/v2/account/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          market_id: market.id,
          side: 'buy',
          ord_type: 'limit',
          price: 1.5,
          volume: 100,
        });

      const response = await request(app)
        .get(`/api/v2/public/order_book/${market.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('asks');
      expect(response.body).toHaveProperty('bids');
    });
  });

  describe('GET /api/v2/public/trades/:market', () => {
    it('should get trade history for market', async () => {
      const response = await request(app)
        .get(`/api/v2/public/trades/${market.id}`)
        .expect(200);

      expect(response.body.trades).toBeInstanceOf(Array);
    });
  });
});

