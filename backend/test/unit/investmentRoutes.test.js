const express = require('express');
const request = require('supertest');

jest.mock('../../models/Portfolio', () => ({
  findById: jest.fn()
}));

jest.mock('../../models/Instrument', () => ({
  find: jest.fn()
}));

jest.mock('../../services/nseMarketDataService', () => ({
  getQuote: jest.fn(),
  getLatestPrices: jest.fn()
}));

jest.mock('../../services/portfolioRecommendationService', () => ({
  analyzePortfolio: jest.fn()
}));

jest.mock('../../models/InstrumentAnalytics', () => ({
  aggregate: jest.fn()
}));

const Portfolio = require('../../models/Portfolio');
const Instrument = require('../../models/Instrument');
const nseMarketDataService = require('../../services/nseMarketDataService');
const portfolioRecommendationService = require('../../services/portfolioRecommendationService');
const InstrumentAnalytics = require('../../models/InstrumentAnalytics');
const investmentRoutes = require('../../routes/investmentRoutes');
const { authenticateToken, generateToken } = require('../../utils/jwt');

describe('Investment Routes - Portfolio Metrics', () => {
  let app;
  let userToken;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/investments', authenticateToken, investmentRoutes);

    userToken = generateToken({
      userId: 'user-1',
      email: 'user@example.com',
      role: 'user'
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const authGet = (url, token = userToken) => {
    const req = request(app).get(url);
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  };

  it('should require authentication', async () => {
    const res = await authGet('/api/investments/portfolio/123/metrics', null);

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
  });

  it('should return 404 when portfolio is not found', async () => {
    Portfolio.findById.mockResolvedValue(null);

    const res = await authGet('/api/investments/portfolio/portfolio-1/metrics');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error', 'Portfolio not found');
  });

  it('should return 403 when accessing another user\'s portfolio', async () => {
    Portfolio.findById.mockResolvedValue({
      _id: 'portfolio-1',
      userId: 'other-user',
      holdings: []
    });

    const res = await authGet('/api/investments/portfolio/portfolio-1/metrics');

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('success', false);
  });

  it('should return metrics for a valid portfolio', async () => {
    Portfolio.findById.mockResolvedValue({
      _id: 'portfolio-1',
      userId: 'user-1',
      holdings: [
        {
          symbol: 'ZENITHBANK',
          quantity: 10,
          avgCost: '30.00'
        }
      ],
      cashBalances: { NGN: '500.00' },
      toObject() {
        return this;
      }
    });

    Instrument.find.mockResolvedValue([
      { symbol: 'ZENITHBANK', sector: 'Banking' }
    ]);

    nseMarketDataService.getQuote.mockResolvedValue({
      success: true,
      data: {
        symbol: 'ZENITHBANK',
        price: '35.00',
        currency: 'NGN'
      }
    });

    const res = await authGet('/api/investments/portfolio/portfolio-1/metrics');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('portfolioId', 'portfolio-1');
    expect(res.body.data.metrics).toBeDefined();
    expect(res.body.data.metrics.totals.totalValue).toBeGreaterThan(0);
    expect(Portfolio.findById).toHaveBeenCalledWith('portfolio-1');
    expect(Instrument.find).toHaveBeenCalled();
    expect(nseMarketDataService.getQuote).toHaveBeenCalledWith('ZENITHBANK');
  });

  describe('GET /portfolio/:id/recommendations', () => {
    it('should require authentication', async () => {
      const res = await authGet('/api/investments/portfolio/123/recommendations', null);
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 404 when portfolio is not found', async () => {
      Portfolio.findById.mockResolvedValue(null);

      const res = await authGet('/api/investments/portfolio/portfolio-1/recommendations');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error', 'Portfolio not found');
    });

    it('should return 403 when accessing another user\'s portfolio', async () => {
      Portfolio.findById.mockResolvedValue({
        _id: 'portfolio-1',
        userId: 'other-user',
        holdings: []
      });

      const res = await authGet('/api/investments/portfolio/portfolio-1/recommendations');

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should return recommendations for a valid portfolio', async () => {
      const mockPortfolio = {
        _id: 'portfolio-1',
        userId: 'user-1',
        holdings: [
          {
            symbol: 'ZENITHBANK',
            quantity: 10,
            avgCost: '30.00'
          }
        ],
        cashBalances: { NGN: '500.00' },
        toObject() {
          return this;
        }
      };

      const mockInstruments = [
        { symbol: 'ZENITHBANK', sector: 'Banking', toObject: () => ({ symbol: 'ZENITHBANK', sector: 'Banking' }) }
      ];

      const mockPrices = {
        ZENITHBANK: { price: '35.00', timestamp: new Date() }
      };

      const mockRecommendations = {
        summary: {
          score: 75,
          riskLevel: 'medium',
          keyFindings: ['Well-diversified portfolio']
        },
        signals: [
          {
            type: 'cash_drag',
            severity: 'info',
            message: 'High cash allocation (15%)',
            suggestedAction: 'Consider deploying excess cash into investments'
          }
        ],
        ai: {
          model: 'rule-based',
          version: '1.0.0',
          timestamp: new Date().toISOString()
        }
      };

      Portfolio.findById.mockResolvedValue(mockPortfolio);
      Instrument.find.mockResolvedValue(mockInstruments);
InstrumentAnalytics.aggregate.mockResolvedValue([
  {
    _id: 'ZENITHBANK',
    doc: {
      symbol: 'ZENITHBANK',
      avgDailyVolume: 200000,
      bidAskSpread: 0.012,
      freeFloatMarketCap: 50000000000
    }
  }
]);
      nseMarketDataService.getLatestPrices.mockResolvedValue(mockPrices);
      portfolioRecommendationService.analyzePortfolio.mockReturnValue(mockRecommendations);

      const res = await authGet('/api/investments/portfolio/portfolio-1/recommendations');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('portfolioId', 'portfolio-1');
      expect(res.body.data).toHaveProperty('summary');
      expect(res.body.data).toHaveProperty('signals');
      expect(res.body.data).toHaveProperty('ai');

      // Verify the recommendation service was called with correct arguments
      expect(portfolioRecommendationService.analyzePortfolio).toHaveBeenCalledWith({
        portfolio: expect.objectContaining({
          _id: 'portfolio-1',
          userId: 'user-1'
        }),
        instrumentsBySymbol: expect.any(Object),
        latestPricesBySymbol: mockPrices
      });
    });
  });
});
