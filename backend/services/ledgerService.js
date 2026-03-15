const { v4: uuidv4 } = require('uuid');
const Decimal = require('decimal.js');
const postgresService = require('./postgresService');

class LedgerService {
  constructor() {
    // Initialize with default precision for financial calculations
    Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });
  }

  /**
   * Create a new account
   * @param {Object} accountData - Account details
   * @returns {Promise<Object>} Created account
   */
  async createAccount(accountData) {
    const { userId, accountNumber, currency, type, name, description = '' } = accountData;

    const result = await postgresService.query(
      `INSERT INTO accounts 
       (user_id, account_number, currency, type, name, description, balance, available_balance)
       VALUES ($1, $2, $3, $4, $5, $6, 0, 0)
       RETURNING *`,
      [userId, accountNumber, currency, type, name, description]
    );

    return result.rows[0];
  }

  /**
   * Get all accounts for a user by user_id
   * @param {string} userId - User ID from MongoDB
   * @returns {Promise<Array>} List of accounts
   */
  async getAccountsForUser(userId) {
    const result = await postgresService.query(
      `SELECT * FROM accounts
       WHERE user_id = $1
       ORDER BY currency, id ASC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Get or create a system settlement account for a given currency
   * @param {string} currency - 3-letter currency code (e.g. 'NGN', 'USD')
   * @returns {Promise<Object>} Account details
   */
  async getOrCreateSystemAccount(currency) {
    const upperCurrency = currency.toUpperCase();

    const existing = await postgresService.query(
      `SELECT * FROM accounts
       WHERE user_id = $1 AND currency = $2
       ORDER BY id ASC
       LIMIT 1`,
      ['SYSTEM', upperCurrency]
    );

    if (existing.rows[0]) {
      return existing.rows[0];
    }

    const settlementAccountNumber = `SYS_${upperCurrency}_SETTLEMENT`;

    return this.createAccount({
      userId: 'SYSTEM',
      accountNumber: settlementAccountNumber,
      currency: upperCurrency,
      type: 'LIABILITY',
      name: `${upperCurrency} Settlement`,
      description: `System settlement account for ${upperCurrency} payouts`
    });
  }

  /**
   * Get the primary account for a user by user_id
   * @param {string} userId - User ID from MongoDB
   * @returns {Promise<Object>} Account details
   */
  async getPrimaryAccountForUser(userId) {
    const result = await postgresService.query(
      `SELECT * FROM accounts
       WHERE user_id = $1
       ORDER BY id ASC
       LIMIT 1`,
      [userId]
    );

    return result.rows[0];
  }

  /**
   * Get account by ID
   * @param {number} accountId - Account ID
   * @returns {Promise<Object>} Account details
   */
  async getAccount(accountId) {
    const result = await postgresService.query(
      'SELECT * FROM accounts WHERE id = $1',
      [accountId]
    );
    return result.rows[0];
  }

  /**
   * Get account by account number
   * @param {string} accountNumber - Account number
   * @returns {Promise<Object>} Account details
   */
  async getAccountByNumber(accountNumber) {
    const result = await postgresService.query(
      'SELECT * FROM accounts WHERE account_number = $1',
      [accountNumber]
    );
    return result.rows[0];
  }

  /**
   * Execute a transfer between accounts
   * @param {Object} transferData - Transfer details
   * @returns {Promise<Object>} Transfer result
   */
  async executeTransfer(transferData) {
    const {
      fromAccountId,
      toAccountId,
      amount,
      currency,
      reference = null,
      description = '',
      metadata = {}
    } = transferData;

    // Convert amount to Decimal for precise arithmetic
    const amountDecimal = new Decimal(amount);
    if (amountDecimal.lte(0)) {
      throw new Error('Transfer amount must be greater than zero');
    }

    return postgresService.withTransaction(async (client) => {
      // 1. Get and lock both accounts
      const [fromAccount, toAccount] = await Promise.all([
        this.getAndLockAccount(client, fromAccountId),
        this.getAndLockAccount(client, toAccountId)
      ]);

      // 2. Validate accounts and balances
      this.validateTransfer(fromAccount, toAccount, amountDecimal, currency);

      // 3. Create transaction record
      const transaction = await this.createTransaction(client, {
        type: 'TRANSFER',
        amount: amountDecimal.toNumber(),
        currency,
        reference,
        description,
        metadata: {
          ...metadata,
          fromAccountId,
          toAccountId
        }
      });

      try {
        // 4. Perform the transfer
        await this.debitAccount(client, fromAccount.id, amountDecimal, transaction.id);
        await this.creditAccount(client, toAccount.id, amountDecimal, transaction.id);

        // 5. Update transaction status to completed
        await this.updateTransactionStatus(client, transaction.id, 'COMPLETED');

        // 6. Create payment record
        const payment = await this.createPayment(client, {
          transactionId: transaction.id,
          fromAccountId,
          toAccountId,
          amount: amountDecimal.toNumber(),
          currency,
          status: 'COMPLETED',
          description,
          metadata
        });

        // 7. Get updated account balances
        const [updatedFromAccount, updatedToAccount] = await Promise.all([
          this.getAccount(fromAccount.id),
          this.getAccount(toAccount.id)
        ]);

        return {
          success: true,
          transactionId: transaction.transaction_id,
          paymentId: payment.payment_id,
          fromAccount: {
            id: updatedFromAccount.id,
            balance: updatedFromAccount.balance,
            availableBalance: updatedFromAccount.available_balance
          },
          toAccount: {
            id: updatedToAccount.id,
            balance: updatedToAccount.balance,
            availableBalance: updatedToAccount.available_balance
          }
        };
      } catch (error) {
        // Let the transaction rollback in withTransaction; don't run more queries on an aborted transaction
        console.error('Transfer transaction failed:', error);
        throw error;
      }
    });
  }

  // Helper methods
  async getAndLockAccount(client, accountId) {
    const result = await client.query(
      'SELECT * FROM accounts WHERE id = $1 FOR UPDATE',
      [accountId]
    );

    if (!result.rows.length) {
      throw new Error(`Account not found: ${accountId}`);
    }

    return result.rows[0];
  }

  validateTransfer(fromAccount, toAccount, amount, currency) {
    if (!fromAccount || !toAccount) {
      throw new Error('Both source and destination accounts must exist');
    }

    if (fromAccount.currency !== currency || toAccount.currency !== currency) {
      throw new Error('Account currency mismatch');
    }

    if (fromAccount.id === toAccount.id) {
      throw new Error('Cannot transfer to the same account');
    }
    const isSystemAccount = fromAccount.user_id === 'SYSTEM';

    // For normal users, enforce non-negative available balance.
    // System accounts are allowed to go negative (tracked via DB constraints).
    if (!isSystemAccount) {
      const availableBalance = new Decimal(fromAccount.available_balance);
      if (availableBalance.lessThan(amount)) {
        throw new Error('Insufficient available balance');
      }
    }
  }

  async createTransaction(client, transactionData) {
    const {
      type,
      amount,
      currency,
      reference = null,
      description = '',
      metadata = {},
      status = 'PENDING'
    } = transactionData;

    try {
      const result = await client.query(
        `INSERT INTO transactions 
         (transaction_id, reference, type, status, amount, currency, description, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          `tx_${uuidv4().replace(/-/g, '')}`,
          reference,
          type,
          status,
          amount,
          currency,
          description,
          JSON.stringify(metadata)
        ]
      );

      return result.rows[0];
    } catch (error) {
      // 23505 = unique_violation in Postgres
      if (error?.code === '23505' && error?.constraint === 'transactions_reference_key') {
        throw new Error('A transaction with this reference already exists');
      }

      throw error;
    }
  }

  async updateTransactionStatus(client, transactionId, status) {
    const result = await client.query(
      `UPDATE transactions 
       SET status = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, transactionId]
    );

    return result.rows[0];
  }

  async debitAccount(client, accountId, amount, transactionId) {
    const amountNum = new Decimal(amount).toNumber();

    // Update account balance
    const result = await client.query(
      `UPDATE accounts 
       SET balance = balance - $1,
           available_balance = available_balance - $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [amountNum, accountId]
    );

    // Create ledger entry
    const account = result.rows[0];
    await this.createLedgerEntry(client, {
      transactionId,
      accountId,
      amount: amountNum, // Positive for debit (matches CHECK constraint)
      balanceBefore: new Decimal(account.balance).plus(amount).toNumber(),
      balanceAfter: account.balance,
      entryType: 'DEBIT'
    });

    return account;
  }

  async creditAccount(client, accountId, amount, transactionId) {
    const amountNum = new Decimal(amount).toNumber();

    // Update account balance
    const result = await client.query(
      `UPDATE accounts 
       SET balance = balance + $1,
           available_balance = available_balance + $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [amountNum, accountId]
    );

    // Create ledger entry
    const account = result.rows[0];
    await this.createLedgerEntry(client, {
      transactionId,
      accountId,
      amount: -amountNum, // Negative for credit (matches CHECK constraint)
      balanceBefore: new Decimal(account.balance).minus(amount).toNumber(),
      balanceAfter: account.balance,
      entryType: 'CREDIT'
    });

    return account;
  }

  async createLedgerEntry(client, entryData) {
    const {
      transactionId,
      accountId,
      amount,
      balanceBefore,
      balanceAfter,
      entryType
    } = entryData;

    const result = await client.query(
      `INSERT INTO ledger_entries 
       (transaction_id, account_id, amount, balance_before, balance_after, entry_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [transactionId, accountId, amount, balanceBefore, balanceAfter, entryType]
    );

    return result.rows[0];
  }

  async createPayment(client, paymentData) {
    const {
      transactionId,
      fromAccountId,
      toAccountId,
      amount,
      currency,
      status,
      description = '',
      metadata = {}
    } = paymentData;

    const result = await client.query(
      `INSERT INTO payments 
       (payment_id, transaction_id, from_account_id, to_account_id, 
        amount, currency, status, description, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        `pay_${uuidv4().replace(/-/g, '')}`,
        transactionId,
        fromAccountId,
        toAccountId,
        amount,
        currency,
        status,
        description,
        JSON.stringify(metadata)
      ]
    );

    return result.rows[0];
  }

  /**
   * List payments/transactions involving a specific account
   * @param {number} accountId
   * @param {object} options
   * @param {number} [options.limit]
   * @param {number} [options.offset]
   * @returns {Promise<Array>} List of transactions
   */
  async getAccountTransactions(accountId, { limit = 20, offset = 0 } = {}) {
    const result = await postgresService.query(
      `SELECT 
         p.payment_id,
         p.transaction_id AS transaction_pk,
         p.from_account_id,
         p.to_account_id,
         p.amount,
         p.currency,
         p.status AS payment_status,
         p.description,
         p.metadata AS payment_metadata,
         p.created_at AS payment_created_at,
         t.transaction_id,
         t.type AS transaction_type,
         t.status AS transaction_status,
         t.reference,
         t.metadata AS transaction_metadata,
         t.created_at AS transaction_created_at
       FROM payments p
       JOIN transactions t ON t.id = p.transaction_id
       WHERE p.from_account_id = $1 OR p.to_account_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [accountId, limit, offset]
    );

    return result.rows;
  }

  /**
   * Get total liabilities and reserves for solvency verification
   * @param {string} currency - Currency to check (e.g. 'NGN')
   * @returns {Promise<Object>} { liabilities, reserves }
   */
  async getSolvencyStats(currency = 'NGN') {
    const liabilitiesResult = await postgresService.query(
      `SELECT SUM(balance) as total FROM accounts 
       WHERE user_id != 'SYSTEM' AND currency = $1 AND is_active = true`,
      [currency]
    );

    const reservesResult = await postgresService.query(
      `SELECT SUM(balance) as total FROM accounts 
       WHERE user_id = 'SYSTEM' AND currency = $1 AND is_active = true`,
      [currency]
    );

    return {
      liabilities: parseFloat(liabilitiesResult.rows[0].total || 0),
      reserves: parseFloat(reservesResult.rows[0].total || 0)
    };
  }
}

// Create a singleton instance
const ledgerService = new LedgerService();
module.exports = ledgerService;