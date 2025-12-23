import { OrderService } from '../../src/services/OrderService';
import { 
  createTestUser, 
  createTestCurrency, 
  createTestAccount,
  createTestMarket 
} from '../helpers/testHelpers';
import { prisma } from '../setup';

describe('OrderService', () => {
  let user: any;
  let baseCurrency: any;
  let quoteCurrency: any;
  let market: any;

  beforeEach(async () => {
    user = await createTestUser();
    
    quoteCurrency = await createTestCurrency({ code: 'USDT', name: 'Tether' });
    baseCurrency = await createTestCurrency({ code: 'VC_TOKEN', name: 'VC Token', type: 'vc_token' });
    
    market = await createTestMarket(baseCurrency.id, quoteCurrency.id);
    
    await createTestAccount(user.id, quoteCurrency.id, 10000);
    await createTestAccount(user.id, baseCurrency.id, 1000);
  });

  describe('createOrder', () => {
    it('should create a buy order', async () => {
      const orderData = {
        userId: user.id,
        marketId: market.id,
        side: 'buy' as const,
        ordType: 'limit' as const,
        price: 1.5,
        volume: 100,
      };

      const order = await OrderService.createOrder(orderData);

      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('side', 'buy');
      expect(order).toHaveProperty('state', 'wait');
      expect(Number(order.price)).toBe(1.5);
      expect(Number(order.volume)).toBe(100);
    });

    it('should create a sell order', async () => {
      const orderData = {
        userId: user.id,
        marketId: market.id,
        side: 'sell' as const,
        ordType: 'limit' as const,
        price: 1.5,
        volume: 50,
      };

      const order = await OrderService.createOrder(orderData);

      expect(order).toHaveProperty('id');
      expect(order).toHaveProperty('side', 'sell');
    });

    it('should lock balance for buy order', async () => {
      const orderData = {
        userId: user.id,
        marketId: market.id,
        side: 'buy' as const,
        ordType: 'limit' as const,
        price: 1.5,
        volume: 100,
      };

      const accountBefore = await prisma.account.findUnique({
        where: {
          userId_currencyId: {
            userId: user.id,
            currencyId: quoteCurrency.id,
          },
        },
      });

      await OrderService.createOrder(orderData);

      const accountAfter = await prisma.account.findUnique({
        where: {
          userId_currencyId: {
            userId: user.id,
            currencyId: quoteCurrency.id,
          },
        },
      });

      const lockedAmount = 1.5 * 100; // price * volume
      expect(Number(accountAfter!.locked)).toBe(lockedAmount);
      expect(Number(accountAfter!.balance)).toBe(Number(accountBefore!.balance) - lockedAmount);
    });

    it('should reject order without sufficient balance', async () => {
      const orderData = {
        userId: user.id,
        marketId: market.id,
        side: 'buy' as const,
        ordType: 'limit' as const,
        price: 1.5,
        volume: 100000, // More than user has
      };

      await expect(
        OrderService.createOrder(orderData)
      ).rejects.toThrow();
    });

    it('should reject invalid market', async () => {
      const orderData = {
        userId: user.id,
        marketId: 'non-existent-market',
        side: 'buy' as const,
        ordType: 'limit' as const,
        price: 1.5,
        volume: 100,
      };

      await expect(
        OrderService.createOrder(orderData)
      ).rejects.toThrow();
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an order', async () => {
      const orderData = {
        userId: user.id,
        marketId: market.id,
        side: 'buy' as const,
        ordType: 'limit' as const,
        price: 1.5,
        volume: 100,
      };

      const order = await OrderService.createOrder(orderData);

      const cancelledOrder = await OrderService.cancelOrder(order.id, user.id);

      expect(cancelledOrder).toHaveProperty('state', 'cancel');
    });

    it('should unlock balance when cancelling buy order', async () => {
      const orderData = {
        userId: user.id,
        marketId: market.id,
        side: 'buy' as const,
        ordType: 'limit' as const,
        price: 1.5,
        volume: 100,
      };

      const order = await OrderService.createOrder(orderData);

      const accountBefore = await prisma.account.findUnique({
        where: {
          userId_currencyId: {
            userId: user.id,
            currencyId: quoteCurrency.id,
          },
        },
      });

      await OrderService.cancelOrder(order.id, user.id);

      const accountAfter = await prisma.account.findUnique({
        where: {
          userId_currencyId: {
            userId: user.id,
            currencyId: quoteCurrency.id,
          },
        },
      });

      expect(Number(accountAfter!.locked)).toBe(0);
      expect(Number(accountAfter!.balance)).toBeGreaterThan(Number(accountBefore!.balance));
    });

    it('should reject cancelling other user\'s order', async () => {
      const orderData = {
        userId: user.id,
        marketId: market.id,
        side: 'buy' as const,
        ordType: 'limit' as const,
        price: 1.5,
        volume: 100,
      };

      const order = await OrderService.createOrder(orderData);
      const otherUser = await createTestUser();

      await expect(
        OrderService.cancelOrder(order.id, otherUser.id)
      ).rejects.toThrow();
    });
  });

  describe('getOrderBook', () => {
    it('should get order book for market', async () => {
      // Create some orders
      await OrderService.createOrder({
        userId: user.id,
        marketId: market.id,
        side: 'buy',
        ordType: 'limit',
        price: 1.4,
        volume: 100,
      });

      await OrderService.createOrder({
        userId: user.id,
        marketId: market.id,
        side: 'sell',
        ordType: 'limit',
        price: 1.6,
        volume: 50,
      });

      const orderBook = await OrderService.getOrderBook(market.id);

      expect(orderBook).toHaveProperty('asks');
      expect(orderBook).toHaveProperty('bids');
      expect(orderBook.bids.length).toBeGreaterThan(0);
      expect(orderBook.asks.length).toBeGreaterThan(0);
    });
  });
});

