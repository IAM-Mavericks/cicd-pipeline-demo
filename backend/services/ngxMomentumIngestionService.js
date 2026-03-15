const Instrument = require('../models/Instrument');
const InstrumentAnalytics = require('../models/InstrumentAnalytics');
const nseMarketDataService = require('./nseMarketDataService');
const Decimal = require('decimal.js');

class NgxMomentumIngestionService {
  constructor() {
    // 1 year look-back for 52-week high/low
    this.lookbackDays = 365;
  }

  async fetchHistory(symbol) {
    const to = new Date().toISOString();
    const from = new Date(Date.now() - this.lookbackDays * 24 * 60 * 60 * 1000)
      .toISOString();

    const res = await nseMarketDataService.getHistorical(symbol, {
      from,
      to,
      limit: 400 // ~ 1.5 yrs trading days
    });
    if (!res.success || !Array.isArray(res.data)) return [];
    const bars = res.data
      .map((b) => ({ date: new Date(b.date), close: Number(b.close) }))
      .filter((b) => b.close > 0)
      .sort((a, b) => a.date - b.date);
    return bars;
  }

  calcStdDev(arr) {
    if (arr.length === 0) return 0;
    const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
    const variance = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length;
    return Math.sqrt(variance);
  }

  calcRSI(prices, period = 14) {
    if (prices.length <= period) return null;
    let gains = 0;
    let losses = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff > 0) gains += diff; else losses -= diff;
    }
    if (gains + losses === 0) return 50;
    const rs = gains / (losses || 1e-9);
    return 100 - 100 / (1 + rs);
  }

  async ingestMomentum() {
    const symbols = await Instrument.find({ status: 'active', exchange: 'NGX' })
      .select('symbol');

    let processed = 0, success = 0, failed = 0;

    for (const { symbol } of symbols) {
      processed += 1;
      try {
        const bars = await this.fetchHistory(symbol);
        if (bars.length < 30) { failed++; continue; }
        const closes = bars.map((b) => b.close);
        const returns = closes.slice(1).map((c, i) => Math.log(c / closes[i]));
        const vol30 = this.calcStdDev(returns.slice(-30)) * Math.sqrt(365);
        const vol90 = this.calcStdDev(returns.slice(-90)) * Math.sqrt(365);
        const rsi14 = this.calcRSI(closes, 14);
        const high52 = Math.max(...closes);
        const low52 = Math.min(...closes);
        const lastClose = closes[closes.length - 1];
        const pctHigh = (lastClose - high52) / high52;
        const pctLow = (lastClose - low52) / low52;
        await InstrumentAnalytics.create({
          symbol,
          asOfDate: new Date(),
          volatility30d: Number(vol30.toFixed(4)),
          volatility90d: Number(vol90.toFixed(4)),
          rsi14: Number(rsi14?.toFixed(2)),
          pctFrom52wHigh: Number(pctHigh.toFixed(4)),
          pctFrom52wLow: Number(pctLow.toFixed(4)),
          source: 'momentum',
          metadata: { sample: bars.length }
        });
        success++;
      } catch (err) {
        console.error('Momentum ingest error', symbol, err.message);
        failed++;
      }
    }
    return { processed, success, failed };
  }
}

module.exports = new NgxMomentumIngestionService();
