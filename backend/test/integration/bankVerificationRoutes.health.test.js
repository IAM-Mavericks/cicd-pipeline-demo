const request = require('supertest')
jest.mock('../../utils/jwt', () => ({
  authenticateToken: (req, res, next) => next(),
  requireRole: () => (req, res, next) => next(),
}))
const app = require('../../app')

jest.mock('../../services/bankVerificationService', () => {
  const impl = { valid: true, account_name: 'JOHN DOE', account_number: '0123456789', bank_code: '058', provider: 'paystack' }
  return {
    verifyAccount: jest.fn(async () => ({ ...impl }))
  }
})

const { verifyAccount } = require('../../services/bankVerificationService')
const providerHealth = require('../../services/providerHealthService')

describe('Bank Verification Health and Cache', () => {
  beforeEach(async () => {
    await providerHealth.reset()
    process.env.BANK_VERIFICATION_PRIMARY = 'paystack'
    process.env.PROVIDER_DEGRADE_THRESHOLD = '1'
    process.env.PROVIDER_HEALTH_WINDOW_MS = '300000'
    process.env.PROVIDER_COOLDOWN_MS = '1000'
    process.env.PROVIDER_BREAKER_OPEN_MS = '60000'
    process.env.BANK_VERIFICATION_CACHE_TTL_S = '300'
    verifyAccount.mockClear()
  })

  test('records success and returns health status', async () => {
    verifyAccount.mockResolvedValueOnce({ valid: true, account_name: 'A', account_number: '1234567890', bank_code: '058', provider: 'paystack' })
    const res = await request(app).post('/api/verify-account').send({ provider: 'paystack', accountNumber: '1234567890', bankCode: '058' })
    expect(res.statusCode).toBe(200)
    const health = await request(app).get('/api/provider-health')
    expect(health.statusCode).toBe(200)
    expect(Array.isArray(health.body.data.order)).toBe(true)
    expect(health.body.data.counts.paystack.successes).toBeGreaterThanOrEqual(1)
  })

  test('opens breaker after failure and returns 503', async () => {
    verifyAccount.mockResolvedValue({ valid: false })
    await request(app).post('/api/verify-account').send({ provider: 'paystack', accountNumber: '2234567890', bankCode: '058' })
    const res = await request(app).post('/api/verify-account').send({ provider: 'paystack', accountNumber: '2234567890', bankCode: '058' })
    expect(res.statusCode).toBe(503)
    const health = await request(app).get('/api/provider-health')
    expect(health.body.data.counts.paystack.failures).toBeGreaterThanOrEqual(1)
  })

  test('uses server-side cache on subsequent call', async () => {
    process.env.PROVIDER_BREAKER_OPEN_MS = '1'
    await new Promise(r => setTimeout(r, 5))
    verifyAccount.mockResolvedValueOnce({ valid: true, account_name: 'Cached', account_number: '3234567890', bank_code: '058', provider: 'paystack' })
    const first = await request(app).post('/api/verify-account').send({ provider: 'paystack', accountNumber: '3234567890', bankCode: '058' })
    expect(first.statusCode).toBe(200)
    verifyAccount.mockResolvedValueOnce({ valid: true, account_name: 'New', account_number: '3234567890', bank_code: '058', provider: 'paystack' })
    const second = await request(app).post('/api/verify-account').send({ provider: 'paystack', accountNumber: '3234567890', bankCode: '058' })
    expect(second.statusCode).toBe(200)
    expect(second.body.data.account_name).toBe('Cached')
  })
})
