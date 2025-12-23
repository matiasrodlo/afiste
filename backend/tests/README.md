# Testing Guide

## Setup

1. Create a test database:
```bash
createdb afiste_test
```

2. Set the test database URL:
```bash
export TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/afiste_test?schema=public"
```

3. Run migrations on test database:
```bash
DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
```

4. Generate Prisma client:
```bash
npm run prisma:generate
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

## Test Structure

```
tests/
├── setup.ts              # Test setup and teardown
├── helpers/
│   └── testHelpers.ts    # Test utility functions
├── api/                  # API endpoint tests
│   ├── auth.test.ts
│   ├── vcFunds.test.ts
│   ├── trading.test.ts
│   ├── tokenOfferings.test.ts
│   └── kyc.test.ts
├── services/             # Service layer tests
└── integration/          # Integration tests
```

## Writing Tests

### Example API Test

```typescript
import request from 'supertest';
import app from '../../src/app';
import { createTestUser, generateToken } from '../helpers/testHelpers';

describe('API Endpoint', () => {
  it('should do something', async () => {
    const user = await createTestUser();
    const token = generateToken(user.id, user.role);

    const response = await request(app)
      .get('/api/v2/endpoint')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty('data');
  });
});
```

## Test Helpers

- `createTestUser()` - Create a test user
- `createTestAdmin()` - Create a test admin user
- `createTestVCFund()` - Create a test VC fund
- `createTestCurrency()` - Create a test currency
- `createTestAccount()` - Create a test account (balance)
- `generateToken()` - Generate JWT token
- `generateRefreshToken()` - Generate refresh token

## Coverage Goals

- API endpoints: > 80%
- Services: > 70%
- Critical paths: > 90%

