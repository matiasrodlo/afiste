import request from 'supertest';
import app from '../../src/app';
import { createTestUser, generateToken } from '../helpers/testHelpers';
import { prisma } from '../setup';

describe('Authentication API', () => {
  describe('POST /api/v2/public/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v2/public/auth/register')
        .send({
          email: `test-${Date.now()}@example.com`,
          password: 'password123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toHaveProperty('email');
    });

    it('should reject duplicate email', async () => {
      const email = `test-${Date.now()}@example.com`;
      await createTestUser({ email });

      await request(app)
        .post('/api/v2/public/auth/register')
        .send({
          email,
          password: 'password123',
        })
        .expect(400);
    });

    it('should reject invalid email format', async () => {
      await request(app)
        .post('/api/v2/public/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);
    });

    it('should reject weak password', async () => {
      await request(app)
        .post('/api/v2/public/auth/register')
        .send({
          email: `test-${Date.now()}@example.com`,
          password: '123',
        })
        .expect(400);
    });
  });

  describe('POST /api/v2/public/auth/login', () => {
    it('should login with valid credentials', async () => {
      const bcrypt = require('bcryptjs');
      const user = await createTestUser({
        email: `test-${Date.now()}@example.com`,
        passwordDigest: await bcrypt.hash('password123', 10),
      });

      const response = await request(app)
        .post('/api/v2/public/auth/login')
        .send({
          email: user.email,
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject invalid credentials', async () => {
      const user = await createTestUser();

      await request(app)
        .post('/api/v2/public/auth/login')
        .send({
          email: user.email,
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(app)
        .post('/api/v2/public/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);
    });
  });

  describe('POST /api/v2/public/auth/refresh_token', () => {
    it('should refresh token successfully', async () => {
      const user = await createTestUser();
      const refreshToken = generateToken(user.id, user.role);

      // Store refresh token (in real app, this would be in database)
      const response = await request(app)
        .post('/api/v2/public/auth/refresh_token')
        .send({
          refreshToken,
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
    });

    it('should reject invalid refresh token', async () => {
      await request(app)
        .post('/api/v2/public/auth/refresh_token')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);
    });
  });

  describe('GET /api/v2/account/profile', () => {
    it('should get user profile with valid token', async () => {
      const user = await createTestUser();
      const token = generateToken(user.id, user.role);

      const response = await request(app)
        .get('/api/v2/account/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.user).toHaveProperty('email', user.email);
    });

    it('should reject request without token', async () => {
      await request(app)
        .get('/api/v2/account/profile')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app)
        .get('/api/v2/account/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});

