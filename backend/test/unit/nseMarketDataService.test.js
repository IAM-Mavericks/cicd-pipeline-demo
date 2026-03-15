jest.mock('axios');

const axios = require('axios');
const nseService = require('../../services/nseMarketDataService');

describe('NseMarketDataService (NGX only)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset cache between tests to avoid cross-test pollution
    if (nseService.cache && nseService.cache.clear) {
      nseService.cache.clear();
    }
  });

  describe('validateSymbol', () => {
    it('should reject empty or invalid symbols', () => {
      const cases = [null, '', 'a', '??', '  '];
      for (const s of cases) {
        const result = nseService.validateSymbol(s);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      }
    });

    it('should accept valid NGX-style symbols', () => {
      const result = nseService.validateSymbol('zenithbank');
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('ZENITHBANK');
    });
  });

  describe('getQuote', () => {
    it('should fail fast for invalid symbols', async () => {
      const res = await nseService.getQuote('??');
      expect(res.success).toBe(false);
      expect(res.errorCode).toBe('INVALID_SYMBOL');
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should return NO_PROVIDER when baseURL is not configured', async () => {
      // Ensure service sees no baseURL
      nseService.baseURL = '';

      const res = await nseService.getQuote('ZENITHBANK');
      expect(res.success).toBe(false);
      expect(res.errorCode).toBe('NO_PROVIDER');
    });

    it('should fetch quote from provider and then serve from cache', async () => {
      nseService.baseURL = 'https://mock-ngx-provider.example/api';

      axios.get.mockResolvedValueOnce({
        data: {
          data: {
            symbol: 'ZENITHBANK',
            last: 35.5,
            open: 34.0,
            high: 36.0,
            low: 34.0,
            previousClose: 34.5,
            volume: 100000,
            timestamp: '2025-01-02T10:00:00Z'
          }
        }
      });

      const first = await nseService.getQuote('ZENITHBANK');
      expect(first.success).toBe(true);
      expect(first.fromCache).toBe(false);
      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(first.data).toMatchObject({
        symbol: 'ZENITHBANK',
        currency: 'NGN',
        source: 'nse'
      });

      const second = await nseService.getQuote('ZENITHBANK');
      expect(second.success).toBe(true);
      expect(second.fromCache).toBe(true);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('getHistorical', () => {
    it('should validate date range and symbol', async () => {
      const badSymbol = await nseService.getHistorical('??', { from: '2025-01-01', to: '2025-01-31' });
      expect(badSymbol.success).toBe(false);
      expect(badSymbol.errorCode).toBe('INVALID_SYMBOL');

      const missingDates = await nseService.getHistorical('ZENITHBANK', {});
      expect(missingDates.success).toBe(false);
      expect(missingDates.errorCode).toBe('INVALID_RANGE');

      const badRange = await nseService.getHistorical('ZENITHBANK', { from: '2025-02-01', to: '2025-01-01' });
      expect(badRange.success).toBe(false);
      expect(badRange.errorCode).toBe('INVALID_RANGE');
    });

    it('should return NO_PROVIDER when baseURL is not configured', async () => {
      nseService.baseURL = '';

      const res = await nseService.getHistorical('ZENITHBANK', {
        from: '2025-01-01',
        to: '2025-01-31'
      });

      expect(res.success).toBe(false);
      expect(res.errorCode).toBe('NO_PROVIDER');
    });

    it('should fetch and normalize historical bars, then cache them', async () => {
      nseService.baseURL = 'https://mock-ngx-provider.example/api';

      axios.get.mockResolvedValueOnce({
        data: {
          data: [
            {
              date: '2025-01-02T10:00:00Z',
              open: 34.0,
              high: 36.0,
              low: 34.0,
              close: 35.5,
              volume: 100000
            },
            {
              date: '2025-01-03T10:00:00Z',
              open: 35.5,
              high: 37.0,
              low: 35.0,
              close: 36.0,
              volume: 150000
            }
          ]
        }
      });

      const params = { from: '2025-01-01', to: '2025-01-31', limit: 50 };
      const first = await nseService.getHistorical('ZENITHBANK', params);
      expect(first.success).toBe(true);
      expect(first.fromCache).toBe(false);
      expect(first.data).toHaveLength(2);
      expect(first.data[0]).toMatchObject({ symbol: 'ZENITHBANK', source: 'nse' });
      expect(axios.get).toHaveBeenCalledTimes(1);

      const second = await nseService.getHistorical('ZENITHBANK', params);
      expect(second.success).toBe(true);
      expect(second.fromCache).toBe(true);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });
  });
});
