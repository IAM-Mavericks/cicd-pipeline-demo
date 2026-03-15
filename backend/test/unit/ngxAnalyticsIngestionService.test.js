
// Mock dependencies
jest.mock('../../models/Instrument');
jest.mock('../../models/InstrumentAnalytics');
jest.mock('../../services/nseMarketDataService');

const Instrument = require('../../models/Instrument');
const InstrumentAnalytics = require('../../models/InstrumentAnalytics');
const nseMarketDataService = require('../../services/nseMarketDataService');
const ngxAnalyticsIngestionService = require('../../services/ngxAnalyticsIngestionService');

describe('ngxAnalyticsIngestionService', () => {
  // no-op for this mock-based test

  beforeAll(() => {
  // no DB needed for this mocked test
});

  afterAll(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should ingest liquidity data for active NGX instruments', async () => {
    // Mock Instrument cursor
    const symbols = ['ZENITHBANK', 'GTCO'];
    const cursorMock = {
      next: jest
        .fn()
        .mockResolvedValueOnce({ symbol: symbols[0] })
        .mockResolvedValueOnce({ symbol: symbols[1] })
        .mockResolvedValueOnce(null)
    };

    Instrument.find.mockReturnValue({ select: () => ({ cursor: () => cursorMock }) });

    // Mock quote responses
    nseMarketDataService.getQuote.mockImplementation(async (symbol) => {
      return {
        success: true,
        data: {
          symbol,
          price: '25.40',
          volume: 210_000,
          bid: 25.35,
          ask: 25.45,
          timestamp: new Date().toISOString()
        }
      };
    });

    InstrumentAnalytics.create.mockResolvedValue({});

    const summary = await ngxAnalyticsIngestionService.ingestDailyLiquidity();

    expect(summary.processed).toBe(2);
    expect(summary.success).toBe(2);
    expect(summary.failed).toBe(0);

    expect(nseMarketDataService.getQuote).toHaveBeenCalledTimes(2);
    expect(InstrumentAnalytics.create).toHaveBeenCalledTimes(2);
    expect(InstrumentAnalytics.create).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: symbols[0] })
    );
  });
});
