const InstrumentAnalytics = require('../models/InstrumentAnalytics');
const Instrument = require('../models/Instrument');
const nseMarketDataService = require('./nseMarketDataService');

/**
 * NGX Analytics Ingestion Service
 * --------------------------------
 * Pulls live quote data from nseMarketDataService and stores liquidity metrics
 * for each NGX symbol in InstrumentAnalytics collection.
 *
 * For Phase-1 we only persist `avgDailyVolume`, `bidAskSpread` (approx.) and
 * `freeFloatMarketCap` if the provider exposes it.
 *
 * The service is written to be cron-friendly but can also be invoked ad-hoc.
 */
class NgxAnalyticsIngestionService {
  constructor() {
    // Sensible defaults; controlled via ENV for prod cron
    this.batchSize = 50;
  }

  /**
   * Ingest liquidity data for all active NGX instruments.
   *
   * @returns {Promise<{ processed: number, success: number, failed: number }>} summary
   */
  async ingestDailyLiquidity() {
    // Fetch active instruments in manageable batches
    const cursor = Instrument.find({ status: 'active', exchange: 'NGX' })
      .select('symbol')
      .cursor();

    let processed = 0;
    let success = 0;
    let failed = 0;

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      processed += 1;
      const symbol = doc.symbol;
      try {
        const quoteRes = await nseMarketDataService.getQuote(symbol);
        if (!quoteRes.success || !quoteRes.data) {
          failed += 1;
          continue;
        }
        const { data } = quoteRes;

        // Very rough bid/ask spread estimation if provider lacks spread fields
        const spreadPct = data.bid && data.ask
          ? (Number(data.ask) - Number(data.bid)) / ((Number(data.ask) + Number(data.bid)) / 2)
          : null;

        await InstrumentAnalytics.create({
          symbol,
          asOfDate: new Date(),
          avgDailyVolume: data.volume || null,
          bidAskSpread: spreadPct,
          metadata: {
            providerRaw: data
          }
        });
        success += 1;
      } catch (err) {
        console.error('ingestDailyLiquidity failed for', symbol, err.message);
        failed += 1;
      }
    }

    return { processed, success, failed };
  }
}

module.exports = new NgxAnalyticsIngestionService();
