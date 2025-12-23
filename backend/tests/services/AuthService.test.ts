import { AuthService } from '../../src/services/AuthService';
import { createTestUser } from '../helpers/testHelpers';
import { prisma } from '../setup';
import bcrypt from 'bcryptjs';

describe('AuthService', () => {
  describe('register', () => {
    it('should register a new user', async () => {
      const email = `test-${Date.now()}@example.com`;
      const password = 'password123';

      const result = await AuthService.register({
        email,
        password,
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(email);
    });

    it('should hash password correctly', async () => {
      const email = `test-${Date.now()}@example.com`;
      const password = 'password123';

      await AuthService.register({
        email,
        password,
      });

      const user = await prisma.user.findUnique({
        where: { email },
      });

      expect(user).not.toBeNull();
      expect(user?.passwordDigest).not.toBe(password);
      const isValid = await bcrypt.compare(password, user!.passwordDigest);
      expect(isValid).toBe(true);
    });

    it('should reject duplicate email', async () => {
      const email = `test-${Date.now()}@example.com`;
      const password = 'password123';

      await AuthService.register({ email, password });

      await expect(
        AuthService.register({ email, password })
      ).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const email = `test-${Date.now()}@example.com`;
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.user.create({
        data: {
          email,
          passwordDigest: hashedPassword,
          kycLevel: 0,
          kycStatus: 'pending',
          role: 'investor',
        },
      });

      const result = await AuthService.login({
        email,
        password,
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(email);
    });

    it('should reject invalid password', async () => {
      const email = `test-${Date.now()}@example.com`;
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.user.create({
        data: {
          email,
          passwordDigest: hashedPassword,
          kycLevel: 0,
          kycStatus: 'pending',
          role: 'investor',
        },
      });

      await expect(
        AuthService.login({
          email,
          password: 'wrongpassword',
        })
      ).rejects.toThrow();
    });

    it('should reject non-existent user', async () => {
      await expect(
        AuthService.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow();
    });
  });

  describe('getProfile', () => {
    it('should get user profile', async () => {
      const user = await createTestUser();

      const profile = await AuthService.getProfile(user.id);

      expect(profile).toHaveProperty('id', user.id);
      expect(profile).toHaveProperty('email', user.email);
    });

    it('should throw error for non-existent user', async () => {
      await expect(
        AuthService.getProfile('non-existent-id')
      ).rejects.toThrow();
    });
  });
});

