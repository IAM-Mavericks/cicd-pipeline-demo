jest.mock('axios', () => require('../mocks/axios'));
jest.mock('../../services/billPaymentService');
jest.mock('../../utils/jwt', () => ({
  authenticateToken: (req, res, next) => next(),
  requireRole: () => (req, res, next) => next(),
}));
const request = require('supertest');

// Mock monitoring service to avoid hitting real Mongo/Redis during tests
jest.mock('../../services/monitoringService', () => ({
  getQuickHealthCheck: jest.fn(),
  getHealthCheck: jest.fn(),
  getMetrics: jest.fn(),
  getSystemMetrics: jest.fn(),
  getApplicationMetrics: jest.fn(),
  checkResourceLimits: jest.fn(),
  trackRequest: jest.fn(),
  trackError: jest.fn(),
}));

const app = require('../../app');
const monitoringService = require('../../services/monitoringService');

describe('API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic endpoints', () => {
    it('GET / should return API metadata', async () => {
      const res = await request(app).get('/');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'SznPay API Server');
      expect(res.body).toHaveProperty('endpoints');
      expect(res.body.endpoints).toHaveProperty('health', '/health');
    });

    it('GET /health should return health status', async () => {
      const res = await request(app).get('/health');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('environment');
    });
  });

  describe('Monitoring endpoints', () => {
    it('GET /api/monitor/health should use quick health check', async () => {
      monitoringService.getQuickHealthCheck.mockResolvedValue({
        status: 'healthy',
        timestamp: '2025-01-01T00:00:00.000Z',
        uptime: 10,
        database: 'healthy'
      });

      const token = 'Bearer test-token';
      const res = await request(app).get('/api/monitor/health').set('Authorization', token);

      expect(res.statusCode).toBe(200);
      expect(monitoringService.getQuickHealthCheck).toHaveBeenCalled();
      expect(res.body).toHaveProperty('status', 'healthy');
    });

    it('GET /api/monitor/metrics should return metrics payload', async () => {
      monitoringService.getMetrics.mockReturnValue({
        timestamp: '2025-01-01T00:00:00.000Z',
        requests_total: 5,
        requests_errors_total: 1,
        response_time_avg_ms: 100,
        response_time_p95_ms: 200,
        uptime_seconds: 50,
        memory_usage_bytes: 123456,
        memory_usage_percent: '60.00'
      });

      const token = 'Bearer test-token';
      const res = await request(app).get('/api/monitor/metrics').set('Authorization', token);

      expect(res.statusCode).toBe(200);
      expect(monitoringService.getMetrics).toHaveBeenCalled();
      expect(res.body).toHaveProperty('requests_total', 5);
      expect(res.body).toHaveProperty('response_time_avg_ms', 100);
    });
  });

  describe('Bill payment endpoints', () => {
    it('GET /api/bills/billers should return billers list', async () => {
      const token = 'Bearer test-token';
      const res = await request(app).get('/api/bills/billers').set('Authorization', token);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('electricity');
      expect(Array.isArray(res.body.data.electricity)).toBe(true);
    });
  });

  describe('404 handler', () => {
    it('should return JSON 404 for unknown routes', async () => {
      const res = await request(app).get('/non-existent-endpoint');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', 'Endpoint not found');
    });
  });
});
