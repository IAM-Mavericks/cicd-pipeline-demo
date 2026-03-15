const express = require('express')
const router = express.Router()
const providerHealth = require('../services/providerHealthService')

router.get('/provider-health', async (req, res) => {
  const s = await providerHealth.status()
  res.json({ status: 'success', data: s })
})

module.exports = router

