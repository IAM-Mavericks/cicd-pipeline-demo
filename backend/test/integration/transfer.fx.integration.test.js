const request = require('supertest');
const postgresService = require('../../services/postgresService');
const ledgerService = require('../../services/ledgerService');
const app = require('../../app');
const { generateToken } = require('../../utils/jwt');

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



const runPgSuite = process.env.PG_TEST_ENABLED === 'true';

(runPgSuite ? describe : describe.skip)('POST /api/transfer/fx', () => {
  beforeAll(async () => {
    // Clean up test data before all tests
    await postgresService.query('TRUNCATE TABLE transactions CASCADE');
    await postgresService.query('TRUNCATE TABLE accounts CASCADE');
    await postgresService.query('TRUNCATE TABLE payments CASCADE');
  });

  afterAll(async () => {
    // Clean up test data after all tests
    await postgresService.query('TRUNCATE TABLE transactions CASCADE');
    await postgresService.query('TRUNCATE TABLE accounts CASCADE');
    await postgresService.query('TRUNCATE TABLE payments CASCADE');
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await postgresService.query('TRUNCATE TABLE transactions CASCADE');
    await postgresService.query('TRUNCATE TABLE accounts CASCADE');
    await postgresService.query('TRUNCATE TABLE payments CASCADE');
  });

  jest.setTimeout(30000);

  const uniqueAccountNumber = (suffix) => {
    return `HTTP_FX_${suffix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  };

  const createFxAccounts = async ({
    userId = 'fx-http-user',
    fromCurrency = 'NGN',
    toCurrency = 'USD',
    seedBalance = 1000000
  } = {}) => {
    const from = await ledgerService.createAccount({
      userId,
      accountNumber: uniqueAccountNumber(`FROM_${fromCurrency}`),
      currency: fromCurrency,
      type: 'ASSET',
      name: `HTTP FX From ${fromCurrency}`,
      description: 'HTTP FX from test account'
    });

    const to = await ledgerService.createAccount({
      userId,
      accountNumber: uniqueAccountNumber(`TO_${toCurrency}`),
      currency: toCurrency,
      type: 'ASSET',
      name: `HTTP FX To ${toCurrency}`,
      description: 'HTTP FX to test account'
    });

    if (seedBalance > 0) {
      await postgresService.query(
        `UPDATE accounts 
         SET balance = $1, available_balance = $1
         WHERE id = $2`,
        [seedBalance, from.id]
      );
    }

    return { userId, from, to };
  };

  it('performs an authenticated NGN -> FX conversion and returns FX payload', async () => {
    const { userId, from, to } = await createFxAccounts({
      userId: 'fx-http-user-1',
      fromCurrency: 'NGN',
      toCurrency: 'USD',
      seedBalance: 150000
    });

    const token = generateToken({
      userId,
      email: 'fx@example.com',
      role: 'user'
    });

    // Generate a short but unique reference
    const uniqueRef = `test-fx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    const payload = {
      fromAccountId: from.id,
      toAccountId: to.id,
      amount: '150000',
      reference: uniqueRef,
      description: 'HTTP FX conversion test'
    };

    const res = await request(app)
      .post('/api/transfer/fx')
      .send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');

    const { data } = res.body;
    expect(data).toHaveProperty('fx', true);
    expect(data).toHaveProperty('sourceCurrency', 'NGN');
    expect(data).toHaveProperty('targetCurrency', 'USD');
    expect(data).toHaveProperty('fromAccount.id', from.id);
    expect(data).toHaveProperty('toAccount.id', to.id);
  });

  it('rejects unsupported non-NGN -> non-NGN FX pairs', async () => {
    const { userId, from, to } = await createFxAccounts({
      userId: 'fx-http-user-2',
      fromCurrency: 'USD',
      toCurrency: 'EUR'
    });

    const token = generateToken({
      userId,
      email: 'fx2@example.com',
      role: 'user'
    });

    const payload = {
      fromAccountId: from.id,
      toAccountId: to.id,
      amount: '100',
      // Generate a short but unique reference
      reference: `test-ufx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      description: 'Unsupported FX pair test'
    };

    const res = await request(app)
      .post('/api/transfer/fx')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toMatch(/Only NGN to\/from foreign currency conversions are supported/);
  });

  it('requires authentication', async () => {
    const { from, to } = await createFxAccounts({
      userId: 'fx-http-user-3',
      fromCurrency: 'NGN',
      toCurrency: 'USD'
    });

    const payload = {
      fromAccountId: from.id,
      toAccountId: to.id,
      amount: '10000'
    };

    const res = await request(app)
      .post('/api/transfer/fx')
      .send(payload);

    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error');
  });
});
