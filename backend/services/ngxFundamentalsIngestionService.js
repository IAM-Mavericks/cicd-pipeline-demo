const Instrument = require('../models/Instrument');
const InstrumentAnalytics = require('../models/InstrumentAnalytics');
const axios = require('axios');

/**
 * NGX Fundamentals Ingestion Service (Phase-2)
 * Pulls quarterly valuation & fundamentals for NGX symbols from a provider
 * (e.g., X-Issuer, Refinitiv Worldscope, or custom scraper) and stores them
 * in InstrumentAnalytics snapshots.
 *
 * In production this should be scheduled quarterly; for now we expose a method
 * that can be called manually or via cron.
 */
class NgxFundamentalsIngestionService {
  constructor() {
    this.providerUrl = process.env.NGX_FUNDAMENTALS_API || '';
  }

  async fetchFundamentals(symbol) {
    if (!this.providerUrl) {
      throw new Error('NGX_FUNDAMENTALS_API not configured');
    }
    const url = `${this.providerUrl}?symbol=${encodeURIComponent(symbol)}`;
    const res = await axios.get(url, { timeout: 10000 });
    return res.data && res.data.data ? res.data.data : res.data;
  }

  /**
   * Ingest fundamentals for all active NGX symbols.
   */
  async ingestQuarterlyFundamentals() {
    const activeSymbols = await Instrument.find({ status: 'active', exchange: 'NGX' })
      .select('symbol');

    let processed = 0;
    let success = 0;
    let failed = 0;

    for (const { symbol } of activeSymbols) {
      processed += 1;
      try {
        const data = await this.fetchFundamentals(symbol);
        if (!data || data.peRatio == null) {
          failed += 1;
          continue;
        }

        await InstrumentAnalytics.create({
          symbol,
          asOfDate: new Date(data.asOfDate || Date.now()),
          peRatio: data.peRatio,
          pbvRatio: data.pbvRatio,
          dividendYield: data.dividendYield,
          evEbitda: data.evEbitda,
          netDebtToEbitda: data.netDebtToEbitda,
          source: 'fundamentals_api',
          metadata: data
        });
        success += 1;
      } catch (err) {
        console.error('Fundamentals ingest failed', symbol, err.message);
        failed += 1;
      }
    }

    return { processed, success, failed };
  }
}

module.exports = new NgxFundamentalsIngestionService();
