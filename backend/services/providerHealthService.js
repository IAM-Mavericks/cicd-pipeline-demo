const redisService = require('./redisService')

function cfg() {
  return {
    windowMs: Number(process.env.PROVIDER_HEALTH_WINDOW_MS || 300000),
    degradeThreshold: Number(process.env.PROVIDER_DEGRADE_THRESHOLD || 3),
    cooldownMs: Number(process.env.PROVIDER_COOLDOWN_MS || 15000),
    breakerOpenMs: Number(process.env.PROVIDER_BREAKER_OPEN_MS || 60000),
    primary: (process.env.BANK_VERIFICATION_PRIMARY || 'paystack') === 'flutterwave' ? 'flutterwave' : 'paystack',
  }
}

const mem = {
  paystack: { f: [], s: [] },
  flutterwave: { f: [], s: [] },
  breaker: { paystack: null, flutterwave: null },
}

const KEY = 'provider_health_metrics'
const BUCKET_SECONDS = 60

function bucketEpoch(now = Date.now()) {
  return Math.floor(Math.floor(now / 1000) / BUCKET_SECONDS)
}

function counterKey(provider, type, bucket) {
  return `prov_health:${provider}:${type}:${bucket}`
}

async function load() {
  try {
    const data = await redisService.get(KEY)
    if (data && typeof data === 'object') return data
  } catch (e) {}
  return mem
}

async function save(m) {
  try {
    const { windowMs } = cfg()
    await redisService.set(KEY, m, Math.ceil(windowMs / 1000) * 2)
  } catch (e) {}
}

function ensureBreakerObject(m, provider) {
  m.breaker = m.breaker || { paystack: null, flutterwave: null }
  const b = m.breaker[provider]
  if (typeof b === 'number') {
    m.breaker[provider] = { state: 'open', openedAt: b, backoffMs: cfg().breakerOpenMs }
  }
}

function pruneLocal(m, windowMs = cfg().windowMs) {
  const now = Date.now()
  for (const p of ['paystack', 'flutterwave']) {
    m[p].f = (m[p].f || []).filter(ts => now - ts <= windowMs)
    m[p].s = (m[p].s || []).filter(ts => now - ts <= windowMs)
  }
}

async function recordSuccess(provider) {
  const m = await load()
  if (!m[provider]) return
  if (redisService.isReady()) {
    const b = bucketEpoch()
    const key = counterKey(provider, 's', b)
    await redisService.increment(key)
    const { windowMs } = cfg()
    await redisService.expire(key, Math.ceil(windowMs / 1000))
  } else {
    m[provider].s = m[provider].s || []
    m[provider].s.push(Date.now())
    pruneLocal(m)
    await save(m)
  }
  ensureBreakerObject(m, provider)
  const b = m.breaker[provider]
  if (b && b.state === 'half') {
    m.breaker[provider] = null
  } else {
    m.breaker[provider] = null
  }
  await save(m)
}

async function recordFailure(provider) {
  const m = await load()
  if (!m[provider]) return
  ensureBreakerObject(m, provider)
  let breaker = m.breaker[provider]
  if (redisService.isReady()) {
    const b = bucketEpoch()
    const key = counterKey(provider, 'f', b)
    await redisService.increment(key)
    const { windowMs, degradeThreshold } = cfg()
    await redisService.expire(key, Math.ceil(windowMs / 1000))
    breaker = m.breaker[provider]
    if (breaker && breaker.state === 'half') {
      const nextBackoff = Math.min((breaker.backoffMs || cfg().breakerOpenMs) * 2, windowMs)
      m.breaker[provider] = { state: 'open', openedAt: Date.now(), backoffMs: nextBackoff }
    } else {
      const failures = await countRecentFailures(provider, windowMs)
      if (failures >= degradeThreshold) {
        m.breaker[provider] = { state: 'open', openedAt: Date.now(), backoffMs: cfg().breakerOpenMs }
      }
    }
    await save(m)
  } else {
    const { degradeThreshold, breakerOpenMs, windowMs } = cfg()
    m[provider].f = m[provider].f || []
    m[provider].f.push(Date.now())
    pruneLocal(m)
    breaker = m.breaker[provider]
    if (breaker && breaker.state === 'half') {
      const nextBackoff = Math.min((breaker.backoffMs || breakerOpenMs) * 2, windowMs)
      m.breaker[provider] = { state: 'open', openedAt: Date.now(), backoffMs: nextBackoff }
    } else {
      const failures = (m[provider].f || []).length
      if (failures >= degradeThreshold) {
        m.breaker[provider] = { state: 'open', openedAt: Date.now(), backoffMs: breakerOpenMs }
      }
    }
    await save(m)
  }
}

async function countRecentFailures(provider, windowMs = cfg().windowMs) {
  if (redisService.isReady()) {
    const nowBucket = bucketEpoch()
    const windowBuckets = Math.ceil(windowMs / 1000 / BUCKET_SECONDS)
    const startBucket = nowBucket - windowBuckets + 1
    const keys = await redisService.getKeys(`prov_health:${provider}:f:*`)
    let sum = 0
    for (const key of keys) {
      const parts = key.split(':')
      const bucket = Number(parts[parts.length - 1])
      if (bucket >= startBucket && bucket <= nowBucket) {
        const val = await redisService.get(key)
        if (typeof val === 'number') sum += val
        else if (typeof val === 'string') sum += Number(val) || 0
      }
    }
    return sum
  }
  const m = await load()
  pruneLocal(m, windowMs)
  return (m[provider]?.f || []).length
}

async function lastFailureWithin(provider, withinMs = cfg().cooldownMs) {
  if (redisService.isReady()) {
    const nowBucket = bucketEpoch()
    const windowBuckets = Math.ceil(withinMs / 1000 / BUCKET_SECONDS)
    const startBucket = nowBucket - windowBuckets + 1
    const keys = await redisService.getKeys(`prov_health:${provider}:f:*`)
    for (const key of keys) {
      const parts = key.split(':')
      const bucket = Number(parts[parts.length - 1])
      if (bucket >= startBucket && bucket <= nowBucket) {
        const val = await redisService.get(key)
        const count = typeof val === 'number' ? val : Number(val) || 0
        if (count > 0) return true
      }
    }
    return false
  }
  const m = await load()
  pruneLocal(m, withinMs)
  const arr = m[provider]?.f || []
  const last = arr[arr.length - 1]
  return last ? Date.now() - last <= withinMs : false
}

async function isOpen(provider) {
  const m = await load()
  ensureBreakerObject(m, provider)
  const b = m.breaker[provider]
  try {
    const failures = await countRecentFailures(provider, cfg().windowMs)
    if ((!b || b.state !== 'open') && failures >= cfg().degradeThreshold) {
      m.breaker[provider] = { state: 'open', openedAt: Date.now(), backoffMs: cfg().breakerOpenMs }
      await save(m)
      return true
    }
  } catch (e) {}
  if (b && b.state === 'open') {
    const open = Date.now() - b.openedAt <= (b.backoffMs || cfg().breakerOpenMs)
    if (open) return true
    m.breaker[provider] = { state: 'half', openedAt: Date.now(), backoffMs: b.backoffMs || cfg().breakerOpenMs }
    await save(m)
    return false
  }
  return false
}

let primaryOverride = null

async function setPrimary(provider) {
  const p = provider === 'flutterwave' ? 'flutterwave' : 'paystack'
  primaryOverride = p
  try { await redisService.set('prov_health:primary', p, 86400) } catch (e) {}
  return p
}

async function getPrimary() {
  if (primaryOverride) return primaryOverride
  try {
    const v = await redisService.get('prov_health:primary')
    if (v && typeof v === 'string') { primaryOverride = v }
  } catch (e) {}
  return primaryOverride || cfg().primary
}

async function recommendedOrder() {
  const basePrimary = await getPrimary()
  const { windowMs, degradeThreshold } = cfg()
  const baseOrder = basePrimary === 'flutterwave' ? ['flutterwave', 'paystack'] : ['paystack', 'flutterwave']
  const failures = await countRecentFailures(baseOrder[0], windowMs)
  if (failures >= degradeThreshold) return [baseOrder[1], baseOrder[0]]
  return baseOrder
}

async function status() {
  const c = cfg()
  const m = await load()
  pruneLocal(m)
  return {
    windowMs: c.windowMs,
    degradeThreshold: c.degradeThreshold,
    cooldownMs: c.cooldownMs,
    breakerOpenMs: c.breakerOpenMs,
    primary: c.primary,
    counts: {
      paystack: { failures: (m.paystack.f || []).length, successes: (m.paystack.s || []).length },
      flutterwave: { failures: (m.flutterwave.f || []).length, successes: (m.flutterwave.s || []).length },
    },
    breaker: m.breaker || { paystack: null, flutterwave: null },
    order: await recommendedOrder(),
  }
}

module.exports = {
  recordSuccess,
  recordFailure,
  countRecentFailures,
  lastFailureWithin,
  recommendedOrder,
  status,
  isOpen,
  setPrimary,
  getPrimary,
  reset: async () => {
    try {
      await redisService.del(KEY)
      const keys = await redisService.getKeys('prov_health:*')
      for (const k of keys) {
        try { await redisService.del(k) } catch (e) {}
      }
    } catch (e) {}
    mem.paystack.f = []
    mem.paystack.s = []
    mem.flutterwave.f = []
    mem.flutterwave.s = []
    mem.breaker = { paystack: null, flutterwave: null }
  }
}
