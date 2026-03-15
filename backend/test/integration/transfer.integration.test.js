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

(runPgSuite ? describe : describe.skip)('POST /api/transfer', () => {
  jest.setTimeout(30000);

  const uniqueAccountNumber = (suffix) => {
    return `HTTP_${suffix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  };

  const createTestAccounts = async () => {
    const from = await ledgerService.createAccount({
      userId: 'http-test-from',
      accountNumber: uniqueAccountNumber('FROM'),
      currency: 'NGN',
      type: 'ASSET',
      name: 'HTTP From Account',
      description: 'HTTP-level transfer test (from)'
    });

    const to = await ledgerService.createAccount({
      userId: 'http-test-to',
      accountNumber: uniqueAccountNumber('TO'),
      currency: 'NGN',
      type: 'ASSET',
      name: 'HTTP To Account',
      description: 'HTTP-level transfer test (to)'
    });

    // Seed the source account with sufficient balance
    await postgresService.query(
      `UPDATE accounts 
       SET balance = $1, available_balance = $1
       WHERE id = $2`,
      [10000, from.id]
    );

    return { from, to };
  };

  it('should perform an authenticated transfer and return updated account balances', async () => {
    const { from, to } = await createTestAccounts();

    const token = generateToken({
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'user'
    });

    const payload = {
      fromAccountId: from.id,
      toAccountId: to.id,
      amount: '5000',
      currency: 'NGN',
      reference: `http-transfer-${Date.now()}`,
      description: 'HTTP-level transfer test'
    };

    const res = await request(app)
      .post('/api/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');

    const { data } = res.body;
    expect(data).toHaveProperty('transactionId');
    expect(data).toHaveProperty('paymentId');
    expect(data).toHaveProperty('fromAccount');
    expect(data).toHaveProperty('toAccount');
    expect(data.fromAccount.id).toBe(from.id);
    expect(data.toAccount.id).toBe(to.id);
  });
});
