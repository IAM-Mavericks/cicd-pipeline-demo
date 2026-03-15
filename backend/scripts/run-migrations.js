require('dotenv').config();
const LedgerMigrations = require('../services/ledgerMigrations');

async function runMigrations() {
  try {
    console.log('🚀 Running ledger migrations...');
    await LedgerMigrations.runMigrations();
    console.log('✅ All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
