const request = require('supertest')
jest.mock('../../utils/jwt', () => ({
  authenticateToken: (req, res, next) => next(),
  requireRole: () => (req, res, next) => next(),
}))
const app = require('../../app')

jest.mock('../../services/bankVerificationService', () => ({
  verifyAccount: jest.fn(async (provider) => ({ valid: true, account_name: 'OK', account_number: '1000000000', bank_code: '058', provider }))
}))

const { verifyAccount } = require('../../services/bankVerificationService')

describe('Provider Health - half-open recovery', () => {
  beforeEach(async () => {
    const providerHealth = require('../../services/providerHealthService')
    await providerHealth.reset()
    process.env.BANK_VERIFICATION_PRIMARY = 'paystack'
    process.env.PROVIDER_DEGRADE_THRESHOLD = '1'
    process.env.PROVIDER_HEALTH_WINDOW_MS = '120000'
    process.env.PROVIDER_COOLDOWN_MS = '500'
    process.env.PROVIDER_BREAKER_OPEN_MS = '200'
    verifyAccount.mockClear()
  })

  test('allows probe after open window and closes on success', async () => {
    const failMock = jest.fn(async () => ({ valid: false }))
    verifyAccount.mockImplementationOnce(failMock)
    await request(app).post('/api/verify-account').send({ provider: 'paystack', accountNumber: '7000000000', bankCode: '058' })
    const blocked = await request(app).post('/api/verify-account').send({ provider: 'paystack', accountNumber: '7000000000', bankCode: '058' })
    expect(blocked.statusCode).toBe(503)
    await new Promise(r => setTimeout(r, 250))
    verifyAccount.mockResolvedValueOnce({ valid: true, account_name: 'OK', account_number: '7000000000', bank_code: '058', provider: 'paystack' })
    const probe = await request(app).post('/api/verify-account').send({ provider: 'paystack', accountNumber: '7000000000', bankCode: '058' })
    expect(probe.statusCode).toBe(200)
    const health = await request(app).get('/api/provider-health')
    expect(health.body.data.breaker.paystack === null || health.body.data.breaker.paystack?.state === undefined).toBe(true)
  })
})
