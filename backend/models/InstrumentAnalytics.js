const mongoose = require('mongoose');

/**
 * InstrumentAnalytics
 * -------------------
 * Daily (or intraday) snapshot of market-microstructure metrics that do not
 * belong in the core Instrument document, e.g. liquidity or free-float which
 * change over time.
 */
const instrumentAnalyticsSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  asOfDate: {
    type: Date,
    required: true,
    default: () => new Date(),
    index: true
  },
  avgDailyVolume: {
    type: Number, // shares
    default: null
  },
  bidAskSpread: {
    type: Number, // percentage (0.01 => 1%)
    default: null
  },
  freeFloatMarketCap: {
    type: Number, // NGN
    default: null
  },
  // Valuation & fundamentals (Phase 2)
  peRatio: {
    type: Number,
    default: null
  },
  pbvRatio: {
    type: Number,
    default: null
  },
  dividendYield: {
    type: Number, // percentage (0.06 => 6%)
    default: null
  },
  evEbitda: {
    type: Number,
    default: null
  },
  netDebtToEbitda: {
    type: Number,
    default: null
  },
  // Momentum & volatility (Phase 3)
  volatility30d: {
    type: Number,
    default: null
  },
  volatility90d: {
    type: Number,
    default: null
  },
  rsi14: {
    type: Number,
    default: null
  },
  pctFrom52wHigh: {
    type: Number,
    default: null
  },
  pctFrom52wLow: {
    type: Number,
    default: null
  },
  source: {
    type: String,
    default: 'nse'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

instrumentAnalyticsSchema.index({ symbol: 1, asOfDate: -1 });

module.exports = mongoose.model('InstrumentAnalytics', instrumentAnalyticsSchema);
