const express = require('express');
const request = require('supertest');

jest.mock('../../models/InstrumentAnalytics', () => ({
  findOne: jest.fn(() => ({ sort: () => ({ lean: () => null }) }))
}));

const InstrumentAnalytics = require('../../models/InstrumentAnalytics');

jest.mock('../../utils/jwt', () => ({
  authenticateToken: (req, _res, next) => { req.user = { userId: 'admin', role: 'admin' }; next(); },
  requireRole: () => (_req, _res, next) => next()
}));

describe('Admin analytics route', () => {
  let app;
  beforeAll(() => {
    app = express();
    const adminRoutes = require('../../routes/adminRoutes');
    app.use(express.json());
    app.use('/api/admin', adminRoutes);
  });

  it('should return latest snapshot', async () => {
    InstrumentAnalytics.findOne.mockReturnValue({
      sort: () => ({
        lean: () => ({ symbol: 'TEST', rsi14: 55 })
      })
    });

    const res = await request(app)
      .get('/api/admin/analytics/latest/TEST').set('Authorization','Bearer test')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.symbol).toBe('TEST');
  });

  it('should handle no data', async () => {
    InstrumentAnalytics.findOne.mockReturnValue({ sort: () => ({ lean: () => null }) });
    const res = await request(app)
      .get('/api/admin/analytics/latest/UNKNOWN').set('Authorization','Bearer test')
      .expect(404);
    expect(res.body.success).toBe(false);
  });
});
