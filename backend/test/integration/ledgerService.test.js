// Mock uuid to avoid Jest trying to load the ESM uuid build
// Generate a very-unique value per call so transaction_id remains unique even across test runs
jest.mock('uuid', () => {
  const { randomBytes } = require('crypto');
  return {
    v4: () => {
      const buf = randomBytes(16).toString('hex');
      // Shape it roughly like a UUID (8-4-4-4-12)
      return [
        buf.slice(0, 8),
        buf.slice(8, 12),
        buf.slice(12, 16),
        buf.slice(16, 20),
        buf.slice(20)
      ].join('-');
    }
  };
});

const ledgerService = require('../../services/ledgerService');
const postgresService = require('../../services/postgresService');

/**
 * These tests exercise the Postgres-backed ledgerService against the real
 * ledger database configured via environment variables.
 *
 * They create throwaway accounts inside each test. If you want to isolate
 * them further, point PG_DATABASE to a dedicated test DB when running `npm test`.
 */

const runPgSuite = process.env.PG_TEST_ENABLED === 'true';

(runPgSuite ? describe : describe.skip)('LedgerService - Postgres ledger integration', () => {
  jest.setTimeout(30000);

  const uniqueAccountNumber = (suffix) => {
    return `TEST_${suffix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  };

  const createTestAccountPair = async ({
    fromBalance = 0,
    toBalance = 0,
    fromCurrency = 'NGN',
    toCurrency = 'NGN'
  } = {}) => {
    const from = await ledgerService.createAccount({
      userId: 'test-user-from',
      accountNumber: uniqueAccountNumber('FROM'),
      currency: fromCurrency,
      type: 'ASSET',
      name: 'Test From Account',
      description: 'Jest integration test account (from)'
    });

    const to = await ledgerService.createAccount({
      userId: 'test-user-to',
      accountNumber: uniqueAccountNumber('TO'),
      currency: toCurrency,
      type: 'ASSET',
      name: 'Test To Account',
      description: 'Jest integration test account (to)'
    });

    // Seed balances directly to avoid depending on additional transfers
    if (fromBalance > 0) {
      await postgresService.query(
        `UPDATE accounts 
         SET balance = $1, available_balance = $1
         WHERE id = $2`,
        [fromBalance, from.id]
      );
    }

    if (toBalance > 0) {
      await postgresService.query(
        `UPDATE accounts 
         SET balance = $1, available_balance = $1
         WHERE id = $2`,
        [toBalance, to.id]
      );
    }

    return { from, to };
  };

  it('should execute a successful transfer between two NGN accounts', async () => {
    const { from, to } = await createTestAccountPair({ fromBalance: 10000 });

    const amount = '5000';

    const result = await ledgerService.executeTransfer({
      fromAccountId: from.id,
      toAccountId: to.id,
      amount,
      currency: 'NGN',
      reference: `jest-success-${Date.now()}`,
      description: 'Jest successful transfer'
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.transactionId).toMatch(/^tx_/);
    expect(result.paymentId).toMatch(/^pay_/);
    expect(result.fromAccount).toHaveProperty('id', from.id);
    expect(result.toAccount).toHaveProperty('id', to.id);
  });

  it('should fail when transfer amount is less than or equal to zero', async () => {
    const { from, to } = await createTestAccountPair();

    await expect(
      ledgerService.executeTransfer({
        fromAccountId: from.id,
        toAccountId: to.id,
        amount: 0,
        currency: 'NGN',
        reference: `jest-zero-${Date.now()}`,
        description: 'Zero amount'
      })
    ).rejects.toThrow('Transfer amount must be greater than zero');
  });

  it('should fail when there is insufficient available balance', async () => {
    const { from, to } = await createTestAccountPair();

    await expect(
      ledgerService.executeTransfer({
        fromAccountId: from.id,
        toAccountId: to.id,
        amount: '1000000',
        currency: 'NGN',
        reference: `jest-insufficient-${Date.now()}`,
        description: 'Insufficient balance test'
      })
    ).rejects.toThrow('Insufficient available balance');
  });

  it('should fail when transferring to the same account', async () => {
    const { from } = await createTestAccountPair();

    await expect(
      ledgerService.executeTransfer({
        fromAccountId: from.id,
        toAccountId: from.id,
        amount: '1000',
        currency: 'NGN',
        reference: `jest-same-${Date.now()}`,
        description: 'Same account transfer'
      })
    ).rejects.toThrow('Cannot transfer to the same account');
  });

  it('should fail when account currencies do not match the transfer currency', async () => {
    const { from, to } = await createTestAccountPair({
      fromCurrency: 'NGN',
      toCurrency: 'USD'
    });

    await expect(
      ledgerService.executeTransfer({
        fromAccountId: from.id,
        toAccountId: to.id,
        amount: '1000',
        currency: 'NGN',
        reference: `jest-currency-${Date.now()}`,
        description: 'Currency mismatch'
      })
    ).rejects.toThrow('Account currency mismatch');
  });

});
