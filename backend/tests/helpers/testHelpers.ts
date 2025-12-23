import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

/**
 * Create a test user
 */
export async function createTestUser(overrides: Partial<any> = {}) {
  const defaultUser = {
    email: `test-${Date.now()}@example.com`,
    passwordDigest: await bcrypt.hash('password123', 10),
    firstName: 'Test',
    lastName: 'User',
    kycLevel: 1,
    kycStatus: 'verified',
    role: 'investor',
    isActive: true,
    isEmailVerified: true,
    ...overrides,
  };

  return await prisma.user.create({
    data: defaultUser,
  });
}

/**
 * Create a test admin user
 */
export async function createTestAdmin(overrides: Partial<any> = {}) {
  return await createTestUser({
    email: `admin-${Date.now()}@example.com`,
    role: 'admin',
    ...overrides,
  });
}

/**
 * Create a test VC fund
 */
export async function createTestVCFund(overrides: Partial<any> = {}) {
  // First create currency if it doesn't exist
  const currency = await prisma.currency.upsert({
    where: { code: 'TEST_VC' },
    update: {},
    create: {
      id: `test-vc-${Date.now()}`,
      code: 'TEST_VC',
      name: 'Test VC Token',
      symbol: 'TVC',
      type: 'vc_token',
      precision: 8,
    },
  });

  const defaultFund = {
    id: `test-fund-${Date.now()}`,
    name: 'Test VC Fund',
    description: 'Test fund description',
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
    ...overrides,
  };

  return await prisma.vCFund.create({
    data: defaultFund,
  });
}

/**
 * Create a test currency
 */
export async function createTestCurrency(overrides: Partial<any> = {}) {
  const defaultCurrency = {
    id: `test-currency-${Date.now()}`,
    code: `TEST${Date.now()}`,
    name: 'Test Currency',
    symbol: 'TST',
    type: 'coin',
    precision: 8,
    ...overrides,
  };

  return await prisma.currency.upsert({
    where: { code: defaultCurrency.code },
    update: defaultCurrency,
    create: defaultCurrency,
  });
}

/**
 * Create a test account (user balance)
 */
export async function createTestAccount(userId: string, currencyId: string, balance: number = 10000) {
  return await prisma.account.upsert({
    where: {
      userId_currencyId: {
        userId,
        currencyId,
      },
    },
    update: {
      balance,
    },
    create: {
      userId,
      currencyId,
      balance,
    },
  });
}

/**
 * Generate JWT token for a user
 */
export function generateToken(userId: string, role: string = 'investor') {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId: string) {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Create a test market
 */
export async function createTestMarket(baseCurrencyId: string, quoteCurrencyId: string) {
  const baseCurrency = await prisma.currency.findUnique({ where: { id: baseCurrencyId } });
  const quoteCurrency = await prisma.currency.findUnique({ where: { id: quoteCurrencyId } });
  
  if (!baseCurrency || !quoteCurrency) {
    throw new Error('Currencies not found');
  }

  const marketId = `${baseCurrency.code}_${quoteCurrency.code}`;
  
  const market = await prisma.market.upsert({
    where: { id: marketId },
    update: {},
    create: {
      id: marketId,
      baseUnit: baseCurrencyId,
      quoteUnit: quoteCurrencyId,
      minPrice: 0.0001,
      maxPrice: 1000000,
      minAmount: 0.01,
      pricePrecision: 8,
      amountPrecision: 8,
      state: 'enabled',
    },
  });

  return market;
}

/**
 * Wait for a specified time (useful for testing async operations)
 */
export function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

