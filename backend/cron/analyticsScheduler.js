/* eslint-disable no-console */
require('dotenv').config();
const cron = require('node-cron');
const mongoose = require('mongoose');
const ngxAnalyticsIngestionService = require('../services/ngxAnalyticsIngestionService');
const ngxFundamentalsIngestionService = require('../services/ngxFundamentalsIngestionService');
const ngxMomentumIngestionService = require('../services/ngxMomentumIngestionService');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dotpay');
    console.log('[analyticsScheduler] Connected to MongoDB');

    // Daily 02:00 liquidity ingest
    cron.schedule('0 2 * * *', async () => {
      console.log('[analyticsScheduler] Running daily liquidity ingest');
      const res = await ngxAnalyticsIngestionService.ingestDailyLiquidity();
      console.log('[analyticsScheduler] Liquidity ingest summary', res);
    });

    // Daily 03:00 momentum ingest
    cron.schedule('0 3 * * *', async () => {
      console.log('[analyticsScheduler] Running daily momentum ingest');
      const res = await ngxMomentumIngestionService.ingestMomentum();
      console.log('[analyticsScheduler] Momentum ingest summary', res);
    });

    // Quarterly fundamentals (first day of Jan/Apr/Jul/Oct at 04:00)
    cron.schedule('0 4 1 1,4,7,10 *', async () => {
      console.log('[analyticsScheduler] Running quarterly fundamentals ingest');
      const res = await ngxFundamentalsIngestionService.ingestQuarterlyFundamentals();
      console.log('[analyticsScheduler] Fundamentals ingest summary', res);
    });

    console.log('[analyticsScheduler] Schedules created');
  } catch (err) {
    console.error('[analyticsScheduler] Failed to start scheduler', err);
    process.exit(1);
  }
})();
