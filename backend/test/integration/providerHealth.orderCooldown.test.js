const request = require('supertest')
jest.mock('../../utils/jwt', () => ({
  authenticateToken: (req, res, next) => next(),
  requireRole: () => (req, res, next) => next(),
}))
const app = require('../../app')

jest.mock('../../services/bankVerificationService', () => ({
  verifyAccount: jest.fn(async (provider) => ({ valid: provider === 'paystack' }))
}))

const { verifyAccount } = require('../../services/bankVerificationService')

describe('Provider Health - order flip and cooldown', () => {
  beforeEach(async () => {
    const providerHealth = require('../../services/providerHealthService')
    await providerHealth.reset()
    process.env.BANK_VERIFICATION_PRIMARY = 'paystack'
    process.env.PROVIDER_DEGRADE_THRESHOLD = '1'
    process.env.PROVIDER_HEALTH_WINDOW_MS = '300000'
    process.env.PROVIDER_COOLDOWN_MS = '2000'
    process.env.PROVIDER_BREAKER_OPEN_MS = '5000'
    verifyAccount.mockClear()
  })

  test('recommended order flips after primary failures', async () => {
    verifyAccount.mockResolvedValueOnce({ valid: false })
    await request(app).post('/api/verify-account').send({ provider: 'paystack', accountNumber: '9000000000', bankCode: '058' })
    const health = await request(app).get('/api/provider-health')
    expect(health.statusCode).toBe(200)
    const order = health.body.data.order
    expect(order[0]).toBe('flutterwave')
  })

  test('cooldown prevents immediate retry with failing provider', async () => {
    verifyAccount.mockResolvedValue({ valid: false })
    await request(app).post('/api/verify-account').send({ provider: 'paystack', accountNumber: '8000000000', bankCode: '058' })
    const res = await request(app).post('/api/verify-account').send({ provider: 'paystack', accountNumber: '8000000000', bankCode: '058' })
    expect(res.statusCode).toBe(503)
  })
})
