const postgresService = require('./postgresService');

class LedgerMigrations {
  static async runMigrations() {
    const client = await postgresService.getClient();
    try {
      await client.query('BEGIN');
      
      // Create enum types first
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_type') THEN
            CREATE TYPE account_type AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
            CREATE TYPE transaction_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');
          END IF;
        END
        $$;
      `);

      // Create tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS accounts (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          account_number VARCHAR(50) UNIQUE NOT NULL,
          currency VARCHAR(3) NOT NULL,
          type account_type NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
          available_balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT positive_balance CHECK (balance >= 0 OR user_id = 'SYSTEM'),
          CONSTRAINT positive_available_balance CHECK (available_balance >= 0 OR user_id = 'SYSTEM')
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          transaction_id VARCHAR(100) UNIQUE NOT NULL,
          reference VARCHAR(100) UNIQUE,
          type VARCHAR(50) NOT NULL,
          status transaction_status NOT NULL DEFAULT 'PENDING',
          amount DECIMAL(20, 8) NOT NULL,
          currency VARCHAR(3) NOT NULL,
          description TEXT,
          metadata JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT positive_amount CHECK (amount > 0)
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ledger_entries (
          id SERIAL PRIMARY KEY,
          transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
          account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
          amount DECIMAL(20, 8) NOT NULL,
          balance_before DECIMAL(20, 8) NOT NULL,
          balance_after DECIMAL(20, 8) NOT NULL,
          entry_type VARCHAR(50) NOT NULL, -- 'DEBIT' or 'CREDIT'
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT valid_balance_flow CHECK (
            (entry_type = 'DEBIT' AND amount > 0) OR 
            (entry_type = 'CREDIT' AND amount < 0)
          )
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS payments (
          id SERIAL PRIMARY KEY,
          payment_id VARCHAR(100) UNIQUE NOT NULL,
          transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
          from_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
          to_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
          amount DECIMAL(20, 8) NOT NULL,
          currency VARCHAR(3) NOT NULL,
          description TEXT,
          status transaction_status NOT NULL DEFAULT 'PENDING',
          metadata JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Create indexes for better query performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_accounts_account_number ON accounts(account_number);
        CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON transactions(transaction_id);
        CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction_id ON ledger_entries(transaction_id);
        CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_id ON ledger_entries(account_id);
        CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);
        CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
      `);

      await client.query('COMMIT');
      console.log('✅ Database schema created successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error running migrations:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = LedgerMigrations;
