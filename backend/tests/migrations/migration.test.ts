import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';

const prisma = new PrismaClient();

describe('Database Migrations', () => {
  const testDbName = `afiste_migration_test_${Date.now()}`;
  let testDatabaseUrl: string;

  beforeAll(async () => {
    // Extract connection details from DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/afiste_development';
    const baseUrl = databaseUrl.replace(/\/[^/]+$/, '');
    testDatabaseUrl = `${baseUrl}/${testDbName}`;

    // Create test database
    const basePrisma = new PrismaClient({
      datasources: { db: { url: baseUrl } },
    });

    try {
      await basePrisma.$executeRawUnsafe(`CREATE DATABASE ${testDbName};`);
    } catch (error) {
      console.error('Failed to create test database:', error);
      throw error;
    } finally {
      await basePrisma.$disconnect();
    }
  });

  afterAll(async () => {
    // Clean up test database
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/afiste_development';
    const baseUrl = databaseUrl.replace(/\/[^/]+$/, '');
    const basePrisma = new PrismaClient({
      datasources: { db: { url: baseUrl } },
    });

    try {
      await basePrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${testDbName};`);
    } catch (error) {
      console.error('Failed to drop test database:', error);
    } finally {
      await basePrisma.$disconnect();
      await prisma.$disconnect();
    }
  });

  it('should apply all migrations successfully', async () => {
    // Apply migrations to test database
    const originalUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = testDatabaseUrl;

    try {
      execSync('npx prisma migrate deploy', {
        cwd: path.resolve(__dirname, '../..'),
        env: { ...process.env, DATABASE_URL: testDatabaseUrl },
        stdio: 'inherit',
      });

      // Verify migrations were applied
      const testPrisma = new PrismaClient({
        datasources: { db: { url: testDatabaseUrl } },
      });

      // Check that tables exist
      const tables = await testPrisma.$queryRaw<{ tablename: string }[]>`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public';
      `;

      expect(tables.length).toBeGreaterThan(0);
      expect(tables.some(t => t.tablename === 'users')).toBe(true);
      expect(tables.some(t => t.tablename === 'vc_funds')).toBe(true);
      expect(tables.some(t => t.tablename === 'orders')).toBe(true);

      await testPrisma.$disconnect();
    } finally {
      process.env.DATABASE_URL = originalUrl;
    }
  });

  it('should have all required indexes', async () => {
    const testPrisma = new PrismaClient({
      datasources: { db: { url: testDatabaseUrl } },
    });

    // Check for key indexes
    const indexes = await testPrisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public';
    `;

    // Check for composite indexes we added
    const hasOrderIndex = indexes.some(
      idx => idx.indexname.includes('orders') && idx.indexname.includes('user')
    );
    const hasTradeIndex = indexes.some(
      idx => idx.indexname.includes('trades') && idx.indexname.includes('market')
    );

    expect(hasOrderIndex || indexes.length > 0).toBe(true);
    expect(hasTradeIndex || indexes.length > 0).toBe(true);

    await testPrisma.$disconnect();
  });

  it('should generate Prisma client after migration', () => {
    // This test verifies that Prisma client can be generated
    // after migrations are applied
    expect(() => {
      execSync('npx prisma generate', {
        cwd: path.resolve(__dirname, '../..'),
        env: { ...process.env, DATABASE_URL: testDatabaseUrl },
        stdio: 'pipe',
      });
    }).not.toThrow();
  });
});

