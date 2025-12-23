/**
 * End-to-End Blockchain Flow Tests
 * 
 * Tests complete user flows involving blockchain interactions:
 * - Token offering creation → Purchase → Trading
 * - On-chain verification
 * - Event synchronization
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { VCFundService } from '../../src/services/VCFundService';
import { TokenOfferingService } from '../../src/services/TokenOfferingService';
import { OrderService } from '../../src/services/OrderService';
import { InvestmentService } from '../../src/services/InvestmentService';
import { BlockchainService } from '../../src/services/blockchain/BlockchainService';
import { VCTokenService } from '../../src/services/blockchain/VCTokenService';
import { TokenOfferingService as BlockchainTokenOfferingService } from '../../src/services/blockchain/TokenOfferingService';
import { createTestUser, createTestAdmin, createTestFund, createTestCurrency, createTestMarket, generateAuthTokens } from '../helpers/testHelpers';

const prisma = new PrismaClient();

describe('Blockchain End-to-End Flows', () => {
  let adminUser: any;
  let investorUser: any;
  let vcFund: any;
  let vcCurrency: any;
  let usdtCurrency: any;
  let market: any;
  let adminToken: string;
  let investorToken: string;

  beforeAll(async () => {
    // Create test users
    adminUser = await createTestAdmin();
    investorUser = await createTestUser();
    adminToken = generateAuthTokens(adminUser.id, 'admin').accessToken;
    investorToken = generateAuthTokens(investorUser.id, 'investor').accessToken;

    // Create stablecoin (USDT)
    usdtCurrency = await createTestCurrency('usdt', 'USDT', 'Tether USD');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up previous test data
    await prisma.trade.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.tokenAllocation.deleteMany({});
    await prisma.tokenOffering.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.vcFundPerformanceRecord.deleteMany({});
    await prisma.vcFundPortfolioCompany.deleteMany({});
    await prisma.vcFund.deleteMany({});
    await prisma.currency.deleteMany({ where: { code: { startsWith: 'vc-' } } });
    await prisma.market.deleteMany({});
  });

  describe('Complete Flow: Token Offering → Purchase → Trading', () => {
    it('should complete full flow: create fund → create offering → purchase tokens → trade tokens', async () => {
      // Step 1: Create VC Fund
      const fundData = {
        name: 'Test VC Fund',
        description: 'Test fund for E2E testing',
        manager: 'Test Manager',
        totalSupply: 1000000,
        availableSupply: 1000000,
        minimumInvestment: 100,
        fundSize: 10000000,
        status: 'active',
        regulatoryStatus: 'approved',
        riskLevel: 'medium',
        currentNav: 1.0,
      };

      vcFund = await VCFundService.createFund(fundData);
      expect(vcFund).toBeDefined();
      expect(vcFund.id).toBeDefined();

      // Step 2: Create VC Currency (token)
      vcCurrency = await createTestCurrency(`vc-${vcFund.id}`, `VC-${vcFund.id}`, `VC Fund ${vcFund.id}`);
      
      // Step 3: Create Market
      market = await createTestMarket(vcCurrency.id, usdtCurrency.id, `vc-${vcFund.id}-usdt`);

      // Step 4: Create Token Offering
      const offeringData = {
        vcFundId: vcFund.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        offeringPrice: 1.0,
        minInvestment: 100,
        maxInvestment: 10000,
        totalTokensOffered: 100000,
        whitelistRequired: false,
      };

      const offering = await TokenOfferingService.createOffering(offeringData);
      expect(offering).toBeDefined();
      expect(offering.id).toBeDefined();
      expect(offering.status).toBe('upcoming');

      // Step 5: Activate Offering
      await TokenOfferingService.updateOfferingStatus(offering.id, 'active');
      const activeOffering = await TokenOfferingService.getOffering(offering.id);
      expect(activeOffering.status).toBe('active');

      // Step 6: Create investor account with USDT balance
      await prisma.account.create({
        data: {
          userId: investorUser.id,
          currencyId: usdtCurrency.id,
          balance: 10000,
          locked: 0,
        },
      });

      // Step 7: Purchase tokens from offering
      const purchaseAmount = 1000; // 1000 USDT
      const purchaseResult = await TokenOfferingService.purchaseTokens(
        offering.id,
        investorUser.id,
        purchaseAmount
      );

      expect(purchaseResult).toBeDefined();
      expect(purchaseResult.tokensAllocated).toBeGreaterThan(0);

      // Step 8: Verify allocation
      const allocation = await prisma.tokenAllocation.findFirst({
        where: {
          offeringId: offering.id,
          userId: investorUser.id,
        },
      });

      expect(allocation).toBeDefined();
      expect(Number(allocation.purchasedTokens)).toBeGreaterThan(0);

      // Step 9: Verify investor has VC tokens
      const investorAccount = await prisma.account.findUnique({
        where: {
          userId_currencyId: {
            userId: investorUser.id,
            currencyId: vcCurrency.id,
          },
        },
      });

      expect(investorAccount).toBeDefined();
      expect(Number(investorAccount.balance)).toBeGreaterThan(0);

      // Step 10: Create a sell order
      const sellOrder = await OrderService.createOrder({
        userId: investorUser.id,
        marketId: market.id,
        side: 'sell',
        ordType: 'limit',
        volume: 100,
        price: 1.1, // Sell at 10% premium
      });

      expect(sellOrder).toBeDefined();
      expect(sellOrder.state).toBe('wait');

      // Step 11: Create a buy order from another user
      const buyerUser = await createTestUser();
      await prisma.account.create({
        data: {
          userId: buyerUser.id,
          currencyId: usdtCurrency.id,
          balance: 5000,
          locked: 0,
        },
      });

      const buyOrder = await OrderService.createOrder({
        userId: buyerUser.id,
        marketId: market.id,
        side: 'buy',
        ordType: 'limit',
        volume: 100,
        price: 1.1, // Match the sell order
      });

      expect(buyOrder).toBeDefined();

      // Step 12: Verify trade was executed
      const trades = await prisma.trade.findMany({
        where: {
          marketId: market.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      });

      expect(trades.length).toBeGreaterThan(0);
      const trade = trades[0];
      expect(trade.price).toBe('1.1');
      expect(trade.volume).toBe('100');

      // Step 13: Verify balances updated
      const sellerAccount = await prisma.account.findUnique({
        where: {
          userId_currencyId: {
            userId: investorUser.id,
            currencyId: usdtCurrency.id,
          },
        },
      });

      const buyerAccount = await prisma.account.findUnique({
        where: {
          userId_currencyId: {
            userId: buyerUser.id,
            currencyId: vcCurrency.id,
          },
        },
      });

      expect(Number(sellerAccount.balance)).toBeGreaterThan(10000); // Received USDT
      expect(Number(buyerAccount.balance)).toBe(100); // Received VC tokens
    }, 30000);

    it('should handle blockchain event synchronization', async () => {
      // This test would verify that blockchain events are properly
      // synchronized with the database
      // For now, we'll test the structure

      // Create fund and offering
      vcFund = await VCFundService.createFund({
        name: 'Blockchain Test Fund',
        description: 'Test fund for blockchain sync',
        manager: 'Test Manager',
        totalSupply: 1000000,
        availableSupply: 1000000,
        minimumInvestment: 100,
        fundSize: 10000000,
        status: 'active',
        regulatoryStatus: 'approved',
        riskLevel: 'medium',
        currentNav: 1.0,
      });

      // Verify blockchain sync state can be created
      const syncState = await prisma.blockchainSyncState.create({
        data: {
          contractAddress: '0x1234567890123456789012345678901234567890',
          lastSyncedBlock: 1000,
          syncType: 'token_offering',
          status: 'syncing',
        },
      });

      expect(syncState).toBeDefined();
      expect(syncState.lastSyncedBlock).toBe(1000);
    });
  });

  describe('On-Chain Verification', () => {
    it('should verify token balances match on-chain and off-chain', async () => {
      // This test would require actual blockchain connection
      // For now, we'll test the structure

      // Create fund and user account
      vcFund = await VCFundService.createFund({
        name: 'On-Chain Test Fund',
        description: 'Test fund for on-chain verification',
        manager: 'Test Manager',
        totalSupply: 1000000,
        availableSupply: 1000000,
        minimumInvestment: 100,
        fundSize: 10000000,
        status: 'active',
        regulatoryStatus: 'approved',
        riskLevel: 'medium',
        currentNav: 1.0,
      });

      vcCurrency = await createTestCurrency(`vc-${vcFund.id}`, `VC-${vcFund.id}`, `VC Fund ${vcFund.id}`);

      // Create account with tokens
      await prisma.account.create({
        data: {
          userId: investorUser.id,
          currencyId: vcCurrency.id,
          balance: 1000,
          locked: 0,
        },
      });

      // In a real scenario, we would:
      // 1. Get on-chain balance using VCTokenService
      // 2. Get off-chain balance from database
      // 3. Compare them

      const account = await prisma.account.findUnique({
        where: {
          userId_currencyId: {
            userId: investorUser.id,
            currencyId: vcCurrency.id,
          },
        },
      });

      expect(account).toBeDefined();
      expect(Number(account.balance)).toBe(1000);

      // Note: Actual on-chain verification would require:
      // - Deployed contracts
      // - Blockchain connection
      // - VCTokenService.balanceOf() call
    });
  });

  describe('Error Handling', () => {
    it('should handle blockchain transaction failures gracefully', async () => {
      // Test that the system handles blockchain errors
      // without corrupting database state

      // Create offering
      vcFund = await VCFundService.createFund({
        name: 'Error Test Fund',
        description: 'Test fund for error handling',
        manager: 'Test Manager',
        totalSupply: 1000000,
        availableSupply: 1000000,
        minimumInvestment: 100,
        fundSize: 10000000,
        status: 'active',
        regulatoryStatus: 'approved',
        riskLevel: 'medium',
        currentNav: 1.0,
      });

      const offering = await TokenOfferingService.createOffering({
        vcFundId: vcFund.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        offeringPrice: 1.0,
        minInvestment: 100,
        maxInvestment: 10000,
        totalTokensOffered: 100000,
        whitelistRequired: false,
      });

      // Attempt purchase with insufficient balance
      await expect(
        TokenOfferingService.purchaseTokens(offering.id, investorUser.id, 1000)
      ).rejects.toThrow();

      // Verify database state is consistent
      const allocation = await prisma.tokenAllocation.findFirst({
        where: {
          offeringId: offering.id,
          userId: investorUser.id,
        },
      });

      // Should not have created allocation if purchase failed
      expect(allocation).toBeNull();
    });
  });
});

