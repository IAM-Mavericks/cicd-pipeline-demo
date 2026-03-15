const redisService = require('./redisService')
const monitoringService = require('./monitoringService')
const ledgerService = require('./ledgerService')

let timer = null

function parseKey(key) {
  const parts = key.split(':')
  const provider = parts[1]
  const id = parts.slice(2).join(':')
  return { provider, id }
}

async function processOne(key) {
  const { provider, id } = parseKey(key)
  const lockKey = `webhook_processing:${provider}:${id}`
  const locked = await redisService.setNX(lockKey, { ts: Date.now() }, 30)
  if (!locked) return
  try {
    const payload = await redisService.get(key)
    if (!payload) return
    await handlePayload(provider, id, payload)
    await redisService.delete(key)
    await redisService.set(`webhook_processed:${provider}:${id}`, { ts: Date.now() }, 86400)
  } catch (e) {
    const retryKey = `webhook_retry:${provider}:${id}`
    const cur = (await redisService.get(retryKey)) || { count: 0 }
    const max = Number(process.env.WEBHOOK_MAX_RETRIES || 5)
    const next = cur.count + 1
    if (next >= max) {
      await redisService.set(`webhook_dlq:${provider}:${id}`, { error: String(e && e.message || e), ts: Date.now() }, 604800)
      await redisService.delete(key)
    } else {
      await redisService.set(retryKey, { count: next, ts: Date.now() }, 86400)
    }
    monitoringService.trackError()
  }
}

async function handlePayload(provider, id, payload) {
  const Transaction = require('../models/Transaction')
  const type = (payload?.event || payload?.data?.event || payload?.data?.status || 'unknown').toString()
  let ref = null
  if (provider === 'paystack') {
    ref = payload?.data?.reference || payload?.data?.transfer_code || payload?.data?.id
  } else if (provider === 'flutterwave') {
    ref = payload?.data?.tx_ref || payload?.data?.flw_ref || payload?.data?.id
  }

  const findQuery = []
  if (ref) {
    findQuery.push({ 'gateway.reference': String(ref) })
    findQuery.push({ transactionId: String(ref) })
  }
  const tx = findQuery.length > 0 ? (await Transaction.findOne({ $or: findQuery })) : null

  const statusMap = {
    paystack: {
      success: 'completed',
      failed: 'failed',
      error: 'failed',
    },
    flutterwave: {
      successful: 'completed',
      failed: 'failed',
      error: 'failed',
    }
  }

  function normalizeStatus(t) {
    const s = (t || '').toLowerCase()
    const map = statusMap[provider] || {}
    return map[s] || (s.includes('success') ? 'completed' : (s.includes('fail') ? 'failed' : 'pending'))
  }

  const normalized = normalizeStatus(type)

  if (tx) {
    tx.gateway = tx.gateway || {}
    tx.gateway.provider = provider
    tx.gateway.reference = tx.gateway.reference || (ref ? String(ref) : tx.gateway.reference)
    tx.gateway.response = payload
    tx.status = normalized
    if (normalized === 'completed') tx.completedAt = new Date()
    if (normalized === 'failed') tx.failedAt = new Date()
    await tx.addStep('webhook_processed', 'success', { provider, id, type, ref })
    await tx.save()
  }

  if (String(type).toLowerCase().includes('refund')) {
    const amount = payload?.data?.amount ? String(payload.data.amount) : '0'
    const currency = payload?.data?.currency || 'NGN'
    const newTx = new Transaction({
      transactionId: `refund_${provider}_${id}`,
      type: 'refund',
      status: 'completed',
      amount,
      currency,
      gateway: { provider, reference: ref || String(id), response: payload },
      completedAt: new Date(),
      steps: []
    })
    await newTx.addStep('refund_recorded', 'success', { provider, id, ref })
    return
  }

  if (normalized === 'completed') {
    const lowerType = String(type).toLowerCase()
    if (tx) {
      const amountStr = tx.amount || (payload?.data?.amount ? String(payload.data.amount) : '0')
      const currency = (tx.currency || payload?.data?.currency || 'NGN').toUpperCase()
      const gwRef = `gw:${provider}:${String(ref || id)}`

      if (lowerType.includes('charge') || lowerType.includes('payment')) {
        const userId = (tx?.to?.userId || tx?.from?.userId) ? String((tx?.to?.userId || tx?.from?.userId)) : null
        if (userId) {
          const accounts = await ledgerService.getAccountsForUser(userId)
          const toAcc = accounts.find(a => a.currency === currency) || accounts[0]
          if (toAcc) {
            const sysAcc = await ledgerService.getOrCreateSystemAccount(currency)
            try {
              await ledgerService.executeTransfer({
                fromAccountId: sysAcc.id,
                toAccountId: toAcc.id,
                amount: amountStr,
                currency,
                reference: gwRef,
                description: `Webhook credit ${provider}`,
                metadata: { provider, eventType: type, webhookId: String(id), originalTransactionId: tx.transactionId }
              })
            } catch (err) {
              const msg = String(err && err.message || '')
              if (!msg.includes('already exists')) throw err
            }
          }
        }
      } else if (lowerType.includes('transfer')) {
        if (tx.type === 'transfer' && !tx.metadata?.bankTransfer) {
          let fromAcc = null
          let toAcc = null
          if (tx.from?.accountNumber) {
            fromAcc = await ledgerService.getAccountByNumber(tx.from.accountNumber)
          }
          if (tx.to?.accountNumber) {
            toAcc = await ledgerService.getAccountByNumber(tx.to.accountNumber)
          }
          if (!fromAcc && tx.from?.userId) {
            const accs = await ledgerService.getAccountsForUser(String(tx.from.userId))
            fromAcc = accs.find(a => a.currency === currency) || accs[0]
          }
          if (!toAcc && tx.to?.userId) {
            const accs = await ledgerService.getAccountsForUser(String(tx.to.userId))
            toAcc = accs.find(a => a.currency === currency) || accs[0]
          }
          if (fromAcc && toAcc) {
            try {
              await ledgerService.executeTransfer({
                fromAccountId: fromAcc.id,
                toAccountId: toAcc.id,
                amount: amountStr,
                currency,
                reference: gwRef,
                description: `Webhook settle ${provider}`,
                metadata: { provider, eventType: type, webhookId: String(id), originalTransactionId: tx.transactionId }
              })
            } catch (err) {
              const msg = String(err && err.message || '')
              if (!msg.includes('already exists')) throw err
            }
          }
        }
      } else if (lowerType.includes('payout') || lowerType.includes('settlement')) {
        // No ledger re-impact for bank payouts; status already updated above
      }
    }
  }
}

async function tick() {
  try {
    const keys = await redisService.getKeys('webhook_event:*')
    const batch = keys.slice(0, Number(process.env.WEBHOOK_PROCESS_BATCH || 50))
    for (const k of batch) {
      await processOne(k)
    }
  } catch (e) {}
}

function start() {
  if (timer) return
  const interval = Number(process.env.WEBHOOK_PROCESS_INTERVAL_MS || 2000)
  timer = setInterval(tick, interval)
}

function stop() {
  if (timer) { clearInterval(timer); timer = null }
}

module.exports = { start, stop }
