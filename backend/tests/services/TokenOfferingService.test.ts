import { TokenOfferingService } from '../../src/services/TokenOfferingService';
import { 
  createTestUser, 
  createTestVCFund, 
  createTestCurrency, 
  createTestAccount 
} from '../helpers/testHelpers';
import { prisma } from '../setup';

describe('TokenOfferingService', () => {
  let user: any;
  let vcFund: any;
  let quoteCurrency: any;

  beforeEach(async () => {
    user = await createTestUser({ kycLevel: 1, kycStatus: 'verified' });
    quoteCurrency = await createTestCurrency({ code: 'USDT', name: 'Tether' });
    const baseCurrency = await createTestCurrency({ code: 'VC_TOKEN', name: 'VC Token', type: 'vc_token' });
    vcFund = await createTestVCFund({ currencyId: baseCurrency.id });
    await createTestAccount(user.id, quoteCurrency.id, 10000);
  });

  describe('createOffering', () => {
    it('should create a token offering', async () => {
      const offeringData = {
        vcFundId: vcFund.id,
        offeringType: 'initial',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        offeringPrice: 1.0,
        minInvestment: 100,
        maxInvestment: 10000,
        totalTokensOffered: 100000,
        currencyId: quoteCurrency.id,
      };

      const offering = await TokenOfferingService.createOffering(offeringData);

      expect(offering).toHaveProperty('id');
      expect(offering).toHaveProperty('vcFundId', vcFund.id);
      expect(offering).toHaveProperty('status', 'active');
      expect(Number(offering.offeringPrice)).toBe(1.0);
    });

    it('should reject duplicate offering for same fund', async () => {
      const offeringData = {
        vcFundId: vcFund.id,
        offeringType: 'initial',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        offeringPrice: 1.0,
        minInvestment: 100,
        maxInvestment: 10000,
        totalTokensOffered: 100000,
        currencyId: quoteCurrency.id,
      };

      await TokenOfferingService.createOffering(offeringData);

      await expect(
        TokenOfferingService.createOffering(offeringData)
      ).rejects.toThrow();
    });
  });

  describe('purchaseTokens', () => {
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

      const result = await TokenOfferingService.purchaseTokens({
        offeringId: offering.id,
        userId: user.id,
        amount: 1000,
      });

      expect(result).toHaveProperty('allocation');
      expect(result.allocation).toHaveProperty('purchasedTokens');
      expect(Number(result.allocation.purchasedTokens)).toBe(1000);
    });

    it('should deduct balance from user account', async () => {
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

      const accountBefore = await prisma.account.findUnique({
        where: {
          userId_currencyId: {
            userId: user.id,
            currencyId: quoteCurrency.id,
          },
        },
      });

      await TokenOfferingService.purchaseTokens({
        offeringId: offering.id,
        userId: user.id,
        amount: 1000,
      });

      const accountAfter = await prisma.account.findUnique({
        where: {
          userId_currencyId: {
            userId: user.id,
            currencyId: quoteCurrency.id,
          },
        },
      });

      expect(Number(accountAfter!.balance)).toBe(Number(accountBefore!.balance) - 1000);
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

      await expect(
        TokenOfferingService.purchaseTokens({
          offeringId: offering.id,
          userId: user.id,
          amount: 50, // Below minimum
        })
      ).rejects.toThrow();
    });

    it('should reject purchase without KYC verification', async () => {
      const unverifiedUser = await createTestUser({ kycLevel: 0, kycStatus: 'pending' });
      await createTestAccount(unverifiedUser.id, quoteCurrency.id, 10000);

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

      await expect(
        TokenOfferingService.purchaseTokens({
          offeringId: offering.id,
          userId: unverifiedUser.id,
          amount: 1000,
        })
      ).rejects.toThrow();
    });
  });

  describe('getOffering', () => {
    it('should get offering by id', async () => {
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

      const result = await TokenOfferingService.getOffering(offering.id);

      expect(result).toHaveProperty('id', offering.id);
      expect(result).toHaveProperty('vcFundId', vcFund.id);
    });

    it('should throw error for non-existent offering', async () => {
      await expect(
        TokenOfferingService.getOffering('non-existent-id')
      ).rejects.toThrow();
    });
  });
});

