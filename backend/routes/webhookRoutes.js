const express = require('express')
const crypto = require('crypto')
const router = express.Router()
const monitoringService = require('../services/monitoringService')
const redisService = require('../services/redisService')

function getRawBody(req) {
  const buf = req.rawBody
  if (Buffer.isBuffer(buf)) return buf
  return Buffer.from(JSON.stringify(req.body || {}))
}

async function isDuplicate(provider, eventId) {
  const key = `webhook_id:${provider}:${eventId}`
  const ttl = Number(process.env.WEBHOOK_IDEMPOTENCY_TTL_S || 86400)
  const set = await redisService.setNX(key, { ts: Date.now() }, ttl)
  return !set
}

async function storeEvent(provider, eventId, payload) {
  const key = `webhook_event:${provider}:${eventId}`
  const ttl = Number(process.env.WEBHOOK_EVENT_TTL_S || 604800)
  await redisService.set(key, payload, ttl)
}

router.post('/webhooks/paystack', async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY
    if (!secret) return res.status(500).send('missing secret')
    const signature = req.headers['x-paystack-signature']
    const raw = getRawBody(req)
    const hash = crypto.createHmac('sha512', secret).update(raw).digest('hex')
    if (!signature || signature !== hash) return res.status(401).send('invalid signature')
    monitoringService.trackRequest()
    monitoringService.trackWebhook('paystack')
    const body = req.body || {}
    const id = body?.data?.id || body?.data?.reference || crypto.createHash('sha256').update(raw).digest('hex')
    if (await isDuplicate('paystack', id)) return res.status(200).send('ok')
    await storeEvent('paystack', id, body)
    return res.status(200).send('ok')
  } catch (e) {
    monitoringService.trackError()
    return res.status(500).send('error')
  }
})

router.post('/webhooks/flutterwave', async (req, res) => {
  try {
    const secretHash = process.env.FLW_SECRET_HASH || process.env.FLW_SECRET_KEY || process.env.FLW_SECRET
    if (!secretHash) return res.status(500).send('missing secret')
    const signature = req.headers['verif-hash']
    if (!signature || signature !== secretHash) return res.status(401).send('invalid signature')
    monitoringService.trackRequest()
    monitoringService.trackWebhook('flutterwave')
    const raw = getRawBody(req)
    const body = req.body || {}
    const id = body?.data?.id || body?.data?.tx_ref || body?.data?.flw_ref || crypto.createHash('sha256').update(raw).digest('hex')
    if (await isDuplicate('flutterwave', id)) return res.status(200).send('ok')
    await storeEvent('flutterwave', id, body)
    return res.status(200).send('ok')
  } catch (e) {
    monitoringService.trackError()
    return res.status(500).send('error')
  }
})

module.exports = router
