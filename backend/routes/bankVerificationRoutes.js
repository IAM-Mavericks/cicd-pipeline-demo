const express = require('express')
const router = express.Router()
const { verifyAccount } = require('../services/bankVerificationService')
const providerHealth = require('../services/providerHealthService')
const redisService = require('../services/redisService')
const memCache = new Map()

// POST /api/verify-account
// body: { provider: 'paystack' | 'flutterwave', accountNumber: string, bankCode: string }
router.post('/verify-account', async (req, res) => {
  try {
    const { provider = 'paystack', accountNumber, bankCode } = req.body || {}
    const corr = req.headers['x-correlation-id'] || `bv-${Date.now()}-${Math.random().toString(36).slice(2,8)}`

    if (!accountNumber || !bankCode) {
      return res.status(400).json({
        status: 'error',
        message: 'accountNumber and bankCode are required',
      })
    }

    if (await providerHealth.isOpen(provider)) {
      return res.status(503).json({ status: 'error', message: 'Provider temporarily unavailable due to recent failures' })
    }
    const cacheKey = `bank_verif:ng:${bankCode}:${accountNumber}`
    let cached = await redisService.get(cacheKey)
    if (!cached && memCache.has(cacheKey)) {
      const entry = memCache.get(cacheKey)
      const ttl = Number(process.env.BANK_VERIFICATION_CACHE_TTL_S || 300) * 1000
      if (Date.now() - entry.ts <= ttl) {
        cached = entry.val
      } else {
        memCache.delete(cacheKey)
      }
    }
    if (cached && typeof cached === 'object' && cached.account_name && cached.account_number) {
      await providerHealth.recordSuccess(provider)
      return res.json({ status: 'success', message: 'Account verified', data: cached })
    }
    const result = await verifyAccount(provider, { accountNumber, bankCode })
    if (result?.valid) {
      await providerHealth.recordSuccess(provider)
      const ttl = Number(process.env.BANK_VERIFICATION_CACHE_TTL_S || 300)
      await redisService.set(cacheKey, result, ttl)
      memCache.set(cacheKey, { ts: Date.now(), val: result })
    } else {
      await providerHealth.recordFailure(provider)
    }
    return res.json({ status: 'success', message: 'Account verified', data: result })
  } catch (err) {
    const message = err?.response?.data?.message || err?.message || 'Verification failed'
    const statusCode = err?.response?.status || 500
    try { await providerHealth.recordFailure((req.body && req.body.provider) ? req.body.provider : 'paystack') } catch (e) {}
    return res.status(statusCode).json({ status: 'error', message })
  }
})

router.delete('/verify-account/cache', async (req, res) => {
  try {
    const { bankCode, accountNumber, all } = req.query || {}
    if (all === 'true') {
      const keys = await redisService.getKeys('bank_verif:*')
      let deleted = 0
      for (const k of keys) { try { await redisService.delete(k); deleted++ } catch (e) {} }
      memCache.clear()
      return res.json({ status: 'success', data: { deleted } })
    }
    if (!bankCode || !accountNumber) {
      return res.status(400).json({ status: 'error', message: 'bankCode and accountNumber required unless all=true' })
    }
    const key = `bank_verif:ng:${bankCode}:${accountNumber}`
    await redisService.delete(key)
    memCache.delete(key)
    res.json({ status: 'success', data: { deleted: 1, key } })
  } catch (e) {
    res.status(500).json({ status: 'error', message: 'Failed to invalidate cache' })
  }
})

module.exports = router
