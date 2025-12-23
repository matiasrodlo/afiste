import { PrismaClient } from '@prisma/client';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/afiste_test?schema=public';

// Global test database client
let prisma: PrismaClient;

beforeAll(async () => {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
  
  // Clean database before all tests
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean database before each test
  await cleanDatabase();
});

async function cleanDatabase() {
  try {
    // Delete in order to respect foreign key constraints
    const tables = [
      'aml_transactions',
      'kyc_documents',
      'token_allocations',
      'token_offerings',
      'fee_charges',
      'fund_fees',
      'dividend_payments',
      'dividend_distributions',
      'governance_votes',
      'governance_proposals',
      'stakes',
      'staking_pools',
      'trades',
      'orders',
      'accounts',
      'markets',
      'vc_fund_performance_records',
      'vc_fund_portfolio_companies',
      'vc_funds',
      'currencies',
      'users',
    ];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
      } catch (error) {
        // Table might not exist, continue
        console.warn(`Could not truncate table ${table}:`, error);
      }
    }
  } catch (error) {
    // Database might not be set up yet, that's okay
    console.warn('Database cleanup failed (might not be initialized):', error);
  }
}

// Export prisma for use in tests
export { prisma };

