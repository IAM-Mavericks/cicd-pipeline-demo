const axios = require('axios');

/**
 * NSE / NGX Market Data Service
 * Provider-agnostic adapter for Nigerian Exchange (NGX) data.
 * - Validates NGX symbols (Nigerian securities only)
 * - Enforces HTTPS and environment-based base URL
 * - Adds lightweight in-memory caching
 */
class NseMarketDataService {
  constructor() {
    this.baseURL = process.env.NSE_API_BASE_URL || '';
    this.apiKey = process.env.NSE_API_KEY || '';

    // Simple in-memory cache: key -> { data, timestamp, ttl }
    this.cache = new Map();

    // TTLs in milliseconds
    this.ttl = {
      quote: 30 * 1000, // 30s for live quotes
      instrument: 60 * 60 * 1000, // 1h for instrument metadata
      historical: 5 * 60 * 1000 // 5m for historical slices
    };

    if (process.env.NODE_ENV === 'production') {
      if (!this.baseURL || !this.baseURL.startsWith('https://')) {
        console.warn('⚠️ NSE_API_BASE_URL not set or not HTTPS. NGX data may be unavailable.');
      }
      if (!this.apiKey) {
        console.warn('⚠️ NSE_API_KEY not set. NGX data provider may reject requests.');
      }
    }
  }

  /**
   * Validate an NGX symbol (Nigerian instruments only).
   * Accepts uppercase letters, digits, and optional dot.
   * @param {string} symbol
   * @returns {{ valid: boolean, normalized?: string, error?: string }}
   */
  validateSymbol(symbol) {
    if (!symbol || typeof symbol !== 'string') {
      return { valid: false, error: 'Symbol is required' };
    }

    const normalized = symbol.trim().toUpperCase();
    // Basic NGX pattern: letters/digits/dot, at least 2 characters
    const pattern = /^[A-Z0-9.]{2,}$/;

    if (!pattern.test(normalized)) {
      return { valid: false, error: 'Invalid NGX symbol format' };
    }

    return { valid: true, normalized };
  }

  buildCacheKey(type, symbol, extra = '') {
    return `${type}:${symbol}:${extra}`;
  }

  getFromCache(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  setCache(key, data, ttl) {
    this.cache.set(key, {
      data,
      ttl,
      timestamp: Date.now()
    });
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  /**
   * Fetch latest quote for an NGX symbol.
   * Returns a normalized payload with NGN currency.
   * @param {string} symbol
   * @returns {Promise<{ success: boolean, data?: object, error?: string, fromCache?: boolean }>}
   */
  async getQuote(symbol) {
    const { valid, normalized, error } = this.validateSymbol(symbol);
    if (!valid) {
      return {
        success: false,
        error,
        errorCode: 'INVALID_SYMBOL'
      };
    }

    const cacheKey = this.buildCacheKey('quote', normalized);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        success: true,
        data: cached,
        fromCache: true
      };
    }

    if (!this.baseURL) {
      return {
        success: false,
        error: 'NSE_API_BASE_URL is not configured',
        errorCode: 'NO_PROVIDER'
      };
    }

    try {
      const url = `${this.baseURL}/quote?symbol=${encodeURIComponent(normalized)}`;
      const response = await axios.get(url, { headers: this.getHeaders() });
      const payload = response.data || {};

      // Expect provider to return an object with price fields; normalize defensively
      const raw = payload.data || payload;
      if (!raw || !raw.symbol || !raw.last || !raw.timestamp) {
        return {
          success: false,
          error: 'Invalid quote payload from provider',
          errorCode: 'BAD_PROVIDER_PAYLOAD'
        };
      }

      const normalizedQuote = {
        symbol: raw.symbol.toUpperCase(),
        price: String(raw.last),
        currency: 'NGN',
        close: String(raw.last),
        open: raw.open != null ? String(raw.open) : null,
        high: raw.high != null ? String(raw.high) : null,
        low: raw.low != null ? String(raw.low) : null,
        previousClose: raw.previousClose != null ? String(raw.previousClose) : null,
        volume: typeof raw.volume === 'number' ? raw.volume : null,
        asOf: new Date(raw.timestamp).toISOString(),
        source: 'nse'
      };

      this.setCache(cacheKey, normalizedQuote, this.ttl.quote);

      return {
        success: true,
        data: normalizedQuote,
        fromCache: false
      };
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch NSE quote';
      return {
        success: false,
        error: message,
        errorCode: 'PROVIDER_ERROR'
      };
    }
  }

  /**
   * Fetch historical OHLCV data for an NGX symbol within a date range.
   * Dates should be ISO strings; range is validated and limited.
   * @param {string} symbol
   * @param {{ from: string, to: string, limit?: number }} options
   */
  async getHistorical(symbol, { from, to, limit = 200 } = {}) {
    const { valid, normalized, error } = this.validateSymbol(symbol);
    if (!valid) {
      return {
        success: false,
        error,
        errorCode: 'INVALID_SYMBOL'
      };
    }

    if (!from || !to) {
      return {
        success: false,
        error: 'from and to dates are required',
        errorCode: 'INVALID_RANGE'
      };
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) {
      return {
        success: false,
        error: 'Invalid date range',
        errorCode: 'INVALID_RANGE'
      };
    }

    // Limit range to prevent huge payloads (e.g. > 5 years)
    const maxRangeMs = 5 * 365 * 24 * 60 * 60 * 1000;
    if (toDate.getTime() - fromDate.getTime() > maxRangeMs) {
      return {
        success: false,
        error: 'Date range too large',
        errorCode: 'RANGE_TOO_LARGE'
      };
    }

    const rangeKey = `${fromDate.toISOString().slice(0, 10)}_${toDate.toISOString().slice(0, 10)}_${limit}`;
    const cacheKey = this.buildCacheKey('historical', normalized, rangeKey);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        success: true,
        data: cached,
        fromCache: true
      };
    }

    if (!this.baseURL) {
      return {
        success: false,
        error: 'NSE_API_BASE_URL is not configured',
        errorCode: 'NO_PROVIDER'
      };
    }

    try {
      const params = new URLSearchParams({
        symbol: normalized,
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        limit: String(limit)
      });
      const url = `${this.baseURL}/historical?${params.toString()}`;
      const response = await axios.get(url, { headers: this.getHeaders() });
      const payload = response.data || {};
      const bars = payload.data || payload.bars || [];

      const normalizedBars = bars.map((bar) => ({
        symbol: normalized,
        date: new Date(bar.date || bar.timestamp).toISOString(),
        open: bar.open != null ? String(bar.open) : null,
        high: bar.high != null ? String(bar.high) : null,
        low: bar.low != null ? String(bar.low) : null,
        close: bar.close != null ? String(bar.close) : null,
        volume: typeof bar.volume === 'number' ? bar.volume : null,
        source: 'nse'
      })).filter((b) => b.close !== null);

      this.setCache(cacheKey, normalizedBars, this.ttl.historical);

      return {
        success: true,
        data: normalizedBars,
        fromCache: false
      };
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch NSE historical data';
      return {
        success: false,
        error: message,
        errorCode: 'PROVIDER_ERROR'
      };
    }
  }
}

module.exports = new NseMarketDataService();
