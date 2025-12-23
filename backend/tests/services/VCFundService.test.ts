import { VCFundService } from '../../src/services/VCFundService';
import { createTestVCFund, createTestCurrency } from '../helpers/testHelpers';
import { prisma } from '../setup';

describe('VCFundService', () => {
  describe('listFunds', () => {
    it('should list all funds', async () => {
      await createTestVCFund();
      await createTestVCFund({ name: 'Second Fund' });

      const result = await VCFundService.listFunds({
        page: 1,
        limit: 10,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      await createTestVCFund({ status: 'active' });
      await createTestVCFund({ status: 'closed', name: 'Closed Fund' });

      const result = await VCFundService.listFunds({
        page: 1,
        limit: 10,
        status: 'active',
      });

      expect(result.data.every((fund: any) => fund.status === 'active')).toBe(true);
    });

    it('should paginate results', async () => {
      // Create multiple funds
      for (let i = 0; i < 5; i++) {
        await createTestVCFund({ name: `Fund ${i}` });
      }

      const result = await VCFundService.listFunds({
        page: 1,
        limit: 2,
      });

      expect(result.data.length).toBeLessThanOrEqual(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
    });
  });

  describe('getFundById', () => {
    it('should get fund by id', async () => {
      const fund = await createTestVCFund();

      const result = await VCFundService.getFundById(fund.id);

      expect(result).toHaveProperty('id', fund.id);
      expect(result).toHaveProperty('name', fund.name);
    });

    it('should throw error for non-existent fund', async () => {
      await expect(
        VCFundService.getFundById('non-existent-id')
      ).rejects.toThrow();
    });
  });

  describe('createFund', () => {
    it('should create a new fund', async () => {
      const currency = await createTestCurrency({ code: 'VC_TOKEN', type: 'vc_token' });

      const fundData = {
        id: `test-fund-${Date.now()}`,
        name: 'New VC Fund',
        description: 'Test description',
        manager: 'Test Manager',
        totalSupply: 1000000,
        availableSupply: 500000,
        fundSize: 10000000,
        minimumInvestment: 1000,
        launchDate: new Date('2024-01-01'),
        maturityDate: new Date('2034-01-01'),
        status: 'active',
        riskLevel: 'medium',
        regulatoryStatus: 'approved',
        currentNav: 1.0,
        tokensAvailablePercentage: 50,
        currencyId: currency.id,
      };

      const result = await VCFundService.createFund(fundData);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name', fundData.name);
    });

    it('should reject duplicate fund id', async () => {
      const currency = await createTestCurrency({ code: 'VC_TOKEN', type: 'vc_token' });
      const fundId = `test-fund-${Date.now()}`;

      const fundData = {
        id: fundId,
        name: 'New VC Fund',
        description: 'Test description',
        manager: 'Test Manager',
        totalSupply: 1000000,
        availableSupply: 500000,
        fundSize: 10000000,
        minimumInvestment: 1000,
        launchDate: new Date('2024-01-01'),
        maturityDate: new Date('2034-01-01'),
        status: 'active',
        riskLevel: 'medium',
        regulatoryStatus: 'approved',
        currentNav: 1.0,
        tokensAvailablePercentage: 50,
        currencyId: currency.id,
      };

      await VCFundService.createFund(fundData);

      await expect(
        VCFundService.createFund(fundData)
      ).rejects.toThrow();
    });
  });

  describe('updateNav', () => {
    it('should update fund NAV', async () => {
      const fund = await createTestVCFund({ currentNav: 1.0 });

      const result = await VCFundService.updateNav(fund.id, 1.5);

      expect(result).toHaveProperty('currentNav', 1.5);
    });

    it('should throw error for non-existent fund', async () => {
      await expect(
        VCFundService.updateNav('non-existent-id', 1.5)
      ).rejects.toThrow();
    });
  });
});

