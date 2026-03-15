const request = require('supertest');

// Mock uuid to avoid Jest trying to load the ESM uuid build
jest.mock('uuid', () => {
  const { randomBytes } = require('crypto');
  return {
    v4: () => {
      const buf = randomBytes(16).toString('hex');
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

// Mock monitoring service to avoid hitting real monitoring behavior during tests
jest.mock('../../services/monitoringService', () => ({
  getQuickHealthCheck: jest.fn(),
  getHealthCheck: jest.fn(),
  getMetrics: jest.fn(),
  getSystemMetrics: jest.fn(),
  getApplicationMetrics: jest.fn(),
  checkResourceLimits: jest.fn(),
  trackRequest: jest.fn(),
  trackError: jest.fn()
}));

const app = require('../../app');
const ledgerService = require('../../services/ledgerService');
const postgresService = require('../../services/postgresService');
const { generateToken } = require('../../utils/jwt');

const runPgSuite = process.env.PG_TEST_ENABLED === 'true';

(runPgSuite ? describe : describe.skip)('POST /api/transfer/bank', () => {
  jest.setTimeout(30000);

  const uniqueAccountNumber = (suffix) => {
    return `HTTP_BANK_${suffix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  };

  const createUserWallet = async ({
    userId = 'bank-http-user',
    currency = 'NGN',
    seedBalance = 100000
  } = {}) => {
    const account = await ledgerService.createAccount({
      userId,
      accountNumber: uniqueAccountNumber('WALLET'),
      currency,
      type: 'ASSET',
      name: `HTTP ${currency} Wallet`,
      description: 'HTTP-level bank transfer test wallet'
    });

    if (seedBalance > 0) {
      await postgresService.query(
        `UPDATE accounts 
         SET balance = $1, available_balance = $1
         WHERE id = $2`,
        [seedBalance, account.id]
      );
    }

    return { userId, account };
  };

  it('performs an authenticated bank transfer from user wallet to system settlement account', async () => {
    const { userId, account } = await createUserWallet({
      userId: 'bank-http-user-1',
      currency: 'NGN',
      seedBalance: 50000
    });

    const token = generateToken({
      userId,
      email: 'bank@example.com',
      role: 'user'
    });

    const payload = {
      amount: '10000',
      currency: 'NGN',
      recipientAccountNumber: '0123456789',
      recipientBankCode: '058',
      recipientName: 'Test Recipient',
      reference: `http-bank-${Date.now()}`,
      description: 'HTTP bank transfer test'
    };

    const res = await request(app)
      .post('/api/transfer/bank')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');

    const { data } = res.body;
    expect(data).toHaveProperty('fromAccount.id', account.id);
    expect(data).toHaveProperty('toAccount.id');

    const systemAccountId = data.toAccount.id;
    const result = await postgresService.query(
      'SELECT * FROM accounts WHERE id = $1',
      [systemAccountId]
    );

    expect(result.rows[0]).toBeDefined();
    expect(result.rows[0].user_id).toBe('SYSTEM');
  });

  it('returns 400 when user has no wallet for the specified currency', async () => {
    const userId = 'bank-http-user-no-wallet';

    const token = generateToken({
      userId,
      email: 'bank-nowallet@example.com',
      role: 'user'
    });

    const payload = {
      amount: '5000',
      currency: 'NGN',
      recipientAccountNumber: '0123456789',
      recipientBankCode: '058',
      recipientName: 'Missing Wallet User'
    };

    const res = await request(app)
      .post('/api/transfer/bank')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toMatch(/No wallet found for currency/);
  });

  it('requires authentication', async () => {
    const payload = {
      amount: '5000',
      currency: 'NGN',
      recipientAccountNumber: '0123456789',
      recipientBankCode: '058'
    };

    const res = await request(app)
      .post('/api/transfer/bank')
      .send(payload);

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
  });
});
