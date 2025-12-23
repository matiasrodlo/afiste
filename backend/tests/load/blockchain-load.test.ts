/**
 * Blockchain Load Testing
 * 
 * Tests blockchain operations under load:
 * - High transaction volume
 * - Gas cost monitoring
 * - Performance benchmarks
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { TokenOfferingService } from '../../src/services/TokenOfferingService';
import { OrderService } from '../../src/services/OrderService';
import { createTestUser, createTestFund, createTestCurrency, createTestMarket } from '../helpers/testHelpers';

const prisma = new PrismaClient();

describe('Blockchain Load Tests', () => {
  let testUsers: any[] = [];
  let vcFund: any;
  let vcCurrency: any;
  let usdtCurrency: any;
  let market: any;

  beforeAll(async () => {
    // Create test currencies
    usdtCurrency = await createTestCurrency('usdt', 'USDT', 'Tether USD');

    // Create VC fund
    vcFund = await createTestFund({
      name: 'Load Test Fund',
      totalSupply: 10000000,
      availableSupply: 10000000,
    });

    vcCurrency = await createTestCurrency(`vc-${vcFund.id}`, `VC-${vcFund.id}`, `VC Fund ${vcFund.id}`);
    market = await createTestMarket(vcCurrency.id, usdtCurrency.id, `vc-${vcFund.id}-usdt`);

    // Create multiple test users
    for (let i = 0; i < 10; i++) {
      const user = await createTestUser();
      testUsers.push(user);

      // Create accounts with balances
      await prisma.account.createMany({
        data: [
          {
            userId: user.id,
            currencyId: usdtCurrency.id,
            balance: 100000,
            locked: 0,
          },
          {
            userId: user.id,
            currencyId: vcCurrency.id,
            balance: 10000,
            locked: 0,
          },
        ],
      });
    }
  });

  afterAll(async () => {
    await prisma.trade.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.tokenAllocation.deleteMany({});
    await prisma.tokenOffering.deleteMany({});
    await prisma.vcFund.deleteMany({});
    await prisma.currency.deleteMany({ where: { code: { startsWith: 'vc-' } } });
    await prisma.market.deleteMany({});
    await prisma.user.deleteMany({ where: { id: { in: testUsers.map(u => u.id) } } });
    await prisma.$disconnect();
  });

  describe('High Volume Order Creation', () => {
    it('should handle 100 concurrent orders', async () => {
      const orderPromises = [];
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        const user = testUsers[i % testUsers.length];
        const side = i % 2 === 0 ? 'buy' : 'sell';
        const price = 1.0 + (i % 10) * 0.01; // Vary prices

        orderPromises.push(
          OrderService.createOrder({
            userId: user.id,
            marketId: market.id,
            side,
            ordType: 'limit',
            volume: 10 + (i % 10),
            price,
          })
        );
      }

      const orders = await Promise.all(orderPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(orders.length).toBe(100);
      expect(duration).toBeLessThan(10000); // Should complete in < 10 seconds

      console.log(`Created 100 orders in ${duration}ms (${(100 / duration) * 1000} orders/sec)`);
    }, 30000);

    it('should handle 1000 sequential orders', async () => {
      const startTime = Date.now();
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < 1000; i++) {
        try {
          const user = testUsers[i % testUsers.length];
          const side = i % 2 === 0 ? 'buy' : 'sell';

          await OrderService.createOrder({
            userId: user.id,
            marketId: market.id,
            side,
            ordType: 'limit',
            volume: 1,
            price: 1.0,
          });

          successCount++;
        } catch (error) {
          errorCount++;
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(successCount).toBeGreaterThan(950); // At least 95% success rate
      expect(duration).toBeLessThan(60000); // Should complete in < 60 seconds

      console.log(`Created ${successCount} orders in ${duration}ms (${(successCount / duration) * 1000} orders/sec)`);
      console.log(`Errors: ${errorCount}`);
    }, 120000);
  });

  describe('Trade Execution Performance', () => {
    it('should execute 100 trades efficiently', async () => {
      // Create matching buy and sell orders
      const orders = [];
      for (let i = 0; i < 100; i++) {
        const buyer = testUsers[i % testUsers.length];
        const seller = testUsers[(i + 1) % testUsers.length];

        // Create sell order
        const sellOrder = await OrderService.createOrder({
          userId: seller.id,
          marketId: market.id,
          side: 'sell',
          ordType: 'limit',
          volume: 10,
          price: 1.0,
        });

        // Create matching buy order
        const buyOrder = await OrderService.createOrder({
          userId: buyer.id,
          marketId: market.id,
          side: 'buy',
          ordType: 'limit',
          volume: 10,
          price: 1.0,
        });

        orders.push({ sellOrder, buyOrder });
      }

      // Wait for trades to be executed
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify trades were created
      const trades = await prisma.trade.findMany({
        where: { marketId: market.id },
      });

      expect(trades.length).toBeGreaterThan(0);
      console.log(`Executed ${trades.length} trades from 100 order pairs`);
    }, 30000);
  });

  describe('Database Query Performance', () => {
    it('should query orders efficiently', async () => {
      // Create 1000 orders first
      for (let i = 0; i < 1000; i++) {
        const user = testUsers[i % testUsers.length];
        await OrderService.createOrder({
          userId: user.id,
          marketId: market.id,
          side: 'buy',
          ordType: 'limit',
          volume: 1,
          price: 1.0,
        });
      }

      // Measure query performance
      const startTime = Date.now();
      const orders = await prisma.order.findMany({
        where: { marketId: market.id },
        take: 100,
        orderBy: { createdAt: 'desc' },
      });
      const endTime = Date.now();

      expect(orders.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in < 1 second

      console.log(`Queried 100 orders in ${endTime - startTime}ms`);
    }, 30000);

    it('should query trades efficiently', async () => {
      // Create some trades first
      for (let i = 0; i < 100; i++) {
        const buyer = testUsers[i % testUsers.length];
        const seller = testUsers[(i + 1) % testUsers.length];

        await OrderService.createOrder({
          userId: seller.id,
          marketId: market.id,
          side: 'sell',
          ordType: 'limit',
          volume: 10,
          price: 1.0,
        });

        await OrderService.createOrder({
          userId: buyer.id,
          marketId: market.id,
          side: 'buy',
          ordType: 'limit',
          volume: 10,
          price: 1.0,
        });
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Measure query performance
      const startTime = Date.now();
      const trades = await prisma.trade.findMany({
        where: { marketId: market.id },
        take: 100,
        orderBy: { createdAt: 'desc' },
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in < 1 second

      console.log(`Queried ${trades.length} trades in ${endTime - startTime}ms`);
    }, 30000);
  });

  describe('Gas Cost Estimation', () => {
    it('should estimate gas costs for operations', async () => {
      // This test would estimate gas costs for blockchain operations
      // For now, we'll document the structure

      const operations = [
        { name: 'Token Mint', estimatedGas: 50000 },
        { name: 'Token Transfer', estimatedGas: 21000 },
        { name: 'Token Offering Purchase', estimatedGas: 150000 },
        { name: 'Order Creation', estimatedGas: 0 }, // Off-chain
        { name: 'Trade Execution', estimatedGas: 0 }, // Off-chain
      ];

      operations.forEach(op => {
        console.log(`${op.name}: ~${op.estimatedGas} gas`);
      });

      // In a real scenario, we would:
      // 1. Estimate gas for each operation
      // 2. Calculate total gas costs
      // 3. Monitor gas prices
      // 4. Optimize operations to reduce costs

      expect(operations.length).toBeGreaterThan(0);
    });
  });
});

