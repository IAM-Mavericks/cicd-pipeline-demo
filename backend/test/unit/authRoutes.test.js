const express = require('express');
const request = require('supertest');
const authRoutes = require('../../routes/authRoutes');

describe('Auth Routes (real handlers, no fake controller)', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  describe('POST /api/auth/register', () => {
    it('should require all mandatory fields', async () => {
      const body = {
        email: 'john@example.com',
        password: 'password123',
        firstName: 'John',
        // Missing lastName, phoneNumber, dateOfBirth
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(body)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', 'All fields are required');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should require email and password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', 'Email and password are required');
    });
  });

  describe('POST /api/auth/verify-mfa', () => {
    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/auth/verify-mfa')
        .send({ sessionId: '123' }) // missing code and method
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should require refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', 'Refresh token required');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message', 'Logged out successfully');
    });
  });
});
