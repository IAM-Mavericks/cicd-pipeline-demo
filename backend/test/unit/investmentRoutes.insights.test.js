jest.mock('../../models/Portfolio');
jest.mock('../../models/Instrument');
jest.mock('../../models/InstrumentAnalytics');
jest.mock('../../services/nseMarketDataService');
jest.mock('../../services/portfolioMetricsService');
jest.mock('../../services/portfolioRecommendationService');

const express = require('express');
const request = require('supertest');
const investmentRoutes = require('../../routes/investmentRoutes');

const Portfolio = require('../../models/Portfolio');
const Instrument = require('../../models/Instrument');
const InstrumentAnalytics = require('../../models/InstrumentAnalytics');
const nseMarketDataService = require('../../services/nseMarketDataService');
const portfolioMetricsService = require('../../services/portfolioMetricsService');
const portfolioRecommendationService = require('../../services/portfolioRecommendationService');

describe('Investment Routes - Insights Endpoint', () => {
  let app;
  let mockPortfolio;
  let mockInstruments;
  let mockAnalytics;
  let mockMetrics;
  let mockRecommendations;
  let mockPortfolioDifferentUser;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup Express app with auth middleware mock
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    app.use('/api/investments', (req, res, next) => {
      const userHeader = req.headers['user'];
      if (userHeader) {
        try {
          req.user = JSON.parse(userHeader);
        } catch (e) {
          req.user = null;
        }
      } else {
        req.user = null;
      }
      next();
    });

    app.use('/api/investments', investmentRoutes);

    // --- Mock Data Initialization ---
    mockPortfolio = {
      _id: '507f1f77bcf86cd799439011',
      userId: 'user123',
      holdings: [
        { symbol: 'AAPL', quantity: 10, avgCost: '150.00' },
        { symbol: 'GOOGL', quantity: 5, avgCost: '2800.00' }
      ],
      cashBalances: { NGN: '10000.00' },
      toObject: jest.fn().mockReturnThis()
    };

    mockPortfolioDifferentUser = {
      _id: '507f1f77bcf86cd799439011',
      userId: 'differentUser',
      holdings: [],
      cashBalances: { NGN: '0' },
      toObject: jest.fn().mockReturnThis()
    };

    mockInstruments = [
      { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' }
    ];

    mockAnalytics = [
      { symbol: 'AAPL', volatility30d: 0.25, avgDailyVolume: 50000000 },
      { symbol: 'GOOGL', volatility30d: 0.30, avgDailyVolume: 20000000 }
    ];

    mockMetrics = {
      totals: { totalValue: 50000 },
      returns: { totalReturnAmount: 5000, totalReturnPct: 10 },
      risk: { riskLevel: 'Moderate', topHoldingWeight: 0.4, topSectorWeight: 0.7, herfindahlSymbol: 0.3, herfindahlSector: 0.5, maxDrawdown: -8.5 },
      allocation: { bySymbol: { AAPL: { weight: 0.4 }, GOOGL: { weight: 0.3 } }, bySector: { Technology: { weight: 0.7 } } }
    };

    mockRecommendations = {
      summary: 'Portfolio looks balanced',
      signals: [
        { id: 'signal1', title: 'Diversification Opportunity', severity: 'medium', category: 'diversification', message: 'Consider adding more sectors', suggestions: ['Add healthcare stocks'], data: {} }
      ],
      performance: {
        attribution: { topContributors: [], sectorContributions: [] },
        volatility: { monthly: 12.4, benchmark: 10.8, correlation: 0.92 }
      }
    };

    // --- Setup Default Mocks ---
    Portfolio.findById.mockResolvedValue(mockPortfolio);
    Instrument.find.mockResolvedValue(mockInstruments);
    InstrumentAnalytics.find.mockResolvedValue(mockAnalytics);
    nseMarketDataService.getQuote.mockResolvedValue({
      success: true,
      data: { price: 160, change: 10, changePercent: 6.67 }
    });
    portfolioMetricsService.computeMetrics.mockReturnValue(mockMetrics);
    portfolioRecommendationService.analyzePortfolio.mockReturnValue(mockRecommendations);
  });

  describe('GET /api/investments/portfolio/:id/insights', () => {
    it('should return 401 when user is not authenticated', async () => {
      const response = await request(app)
        .get('/api/investments/portfolio/507f1f77bcf86cd799439011/insights');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 404 when portfolio is not found', async () => {
      Portfolio.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/investments/portfolio/507f1f77bcf86cd799439011/insights')
        .set('user', JSON.stringify({ userId: 'user123' }));

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Portfolio not found');
    });

    it('should return 403 when user is not authorized to access portfolio', async () => {
      Portfolio.findById.mockResolvedValueOnce(mockPortfolioDifferentUser);

      const response = await request(app)
        .get('/api/investments/portfolio/507f1f77bcf86cd799439011/insights')
        .set('user', JSON.stringify({ userId: 'user123' }));

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('You are not authorized to access this portfolio');
    });

    it('should return portfolio insights successfully', async () => {
      const response = await request(app)
        .get('/api/investments/portfolio/507f1f77bcf86cd799439011/insights')
        .set('user', JSON.stringify({ userId: 'user123' }));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('signals');
      expect(response.body.data).toHaveProperty('performance');
      expect(response.body.data).toHaveProperty('tax');

      // Check summary structure
      expect(response.body.data.summary).toHaveProperty('totalValue');
      expect(response.body.data.summary).toHaveProperty('totalReturn');
      expect(response.body.data.summary).toHaveProperty('totalReturnPct');
      expect(response.body.data.summary).toHaveProperty('riskScore');
      expect(response.body.data.summary).toHaveProperty('riskLevel');
      expect(response.body.data.summary).toHaveProperty('diversificationScore');
      expect(response.body.data.summary).toHaveProperty('lastUpdated');

      // Check metrics structure
      expect(response.body.data.metrics).toHaveProperty('returns');
      expect(response.body.data.metrics).toHaveProperty('risk');
      expect(response.body.data.metrics).toHaveProperty('diversification');

      // Check signals structure
      expect(Array.isArray(response.body.data.signals)).toBe(true);
      if (response.body.data.signals.length > 0) {
        expect(response.body.data.signals[0]).toHaveProperty('id');
        expect(response.body.data.signals[0]).toHaveProperty('title');
        expect(response.body.data.signals[0]).toHaveProperty('severity');
        expect(response.body.data.signals[0]).toHaveProperty('category');
        expect(response.body.data.signals[0]).toHaveProperty('message');
        expect(response.body.data.signals[0]).toHaveProperty('suggestions');
        expect(response.body.data.signals[0]).toHaveProperty('data');
      }

      // Check performance structure
      expect(response.body.data.performance).toHaveProperty('attribution');
      expect(response.body.data.performance).toHaveProperty('volatility');

      // Check tax structure
      expect(response.body.data.tax).toHaveProperty('estimatedTaxLiability');
      expect(response.body.data.tax).toHaveProperty('taxEfficient');
      expect(response.body.data.tax).toHaveProperty('suggestions');
    });

    it('should handle errors and return 500', async () => {
      Portfolio.findById.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/investments/portfolio/507f1f77bcf86cd799439011/insights')
        .set('user', JSON.stringify({ userId: 'user123' }));

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to generate portfolio insights');
    });

    it('should handle empty holdings gracefully', async () => {
      const portfolioWithEmptyHoldings = {
        ...mockPortfolio,
        holdings: []
      };
      Portfolio.findById.mockResolvedValue(portfolioWithEmptyHoldings);

      const response = await request(app)
        .get('/api/investments/portfolio/507f1f77bcf86cd799439011/insights')
        .set('user', JSON.stringify({ userId: 'user123' }));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
    });

    it('should handle service failures gracefully', async () => {
      nseMarketDataService.getQuote.mockRejectedValue(new Error('Market data service error'));

      const response = await request(app)
        .get('/api/investments/portfolio/507f1f77bcf86cd799439011/insights')
        .set('user', JSON.stringify({ userId: 'user123' }));

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to generate portfolio insights');
    });
  });
});
