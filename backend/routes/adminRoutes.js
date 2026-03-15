const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const FraudCase = require('../models/FraudCase');
const { authenticateToken, requireRole } = require('../utils/jwt');
const complianceService = require('../services/complianceService');
const providerHealth = require('../services/providerHealthService');
const redisService = require('../services/redisService');

const router = express.Router();

// Protect all admin routes with JWT auth and admin role check
router.use(authenticateToken, requireRole(['admin']));

// GET /api/admin/users - list users with filtering and pagination
router.get('/users', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      role,
      kycTier
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (role) {
      filter.role = role;
    }

    if (kycTier) {
      filter['kyc.tier'] = parseInt(kycTier, 10);
    }

    if (search && search.trim()) {
      const pattern = new RegExp(search.trim(), 'i');
      filter.$or = [
        { email: pattern },
        { phoneNumber: pattern },
        { firstName: pattern },
        { lastName: pattern }
      ];
    }

    const query = User.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .select('-password -security.transactionPin');

    const [users, total] = await Promise.all([
      query.exec(),
      User.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        items: users,
        pagination: {
          page: pageNum,
          limit: pageSize,
          total,
          totalPages: Math.ceil(total / pageSize) || 1
        }
      }
    });
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// POST /api/admin/users/:id/lock - lock/suspend a user account
router.post('/users/:id/lock', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, durationMinutes } = req.body || {};

    const update = {
      status: 'suspended',
      'security.failedLoginAttempts': 0
    };

    if (durationMinutes && Number.isFinite(durationMinutes)) {
      update['security.lockedUntil'] = new Date(Date.now() + durationMinutes * 60 * 1000);
    } else {
      update['security.lockedUntil'] = null;
    }

    const user = await User.findByIdAndUpdate(id, update, { new: true });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Log compliance event
    await complianceService.logComplianceEvent({
      type: 'ACCOUNT_LOCKED',
      severity: 'high',
      userId: user._id,
      details: { reason, durationMinutes }
    });

    res.json({
      success: true,
      data: {
        id: user._id,
        status: user.status,
        lockedUntil: user.security?.lockedUntil || null
      }
    });
  } catch (error) {
    console.error('Admin lock user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to lock user account'
    });
  }
});

// POST /api/admin/users/:id/unlock - unlock/reactivate a user account
router.post('/users/:id/unlock', async (req, res) => {
  try {
    const { id } = req.params;

    const update = {
      status: 'active',
      'security.failedLoginAttempts': 0,
      'security.lockedUntil': null
    };

    const user = await User.findByIdAndUpdate(id, update, { new: true });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    await complianceService.logComplianceEvent({
      type: 'ACCOUNT_UNLOCKED',
      severity: 'medium',
      userId: user._id,
      details: {}
    });

    res.json({
      success: true,
      data: {
        id: user._id,
        status: user.status,
        lockedUntil: user.security?.lockedUntil || null
      }
    });
  } catch (error) {
    console.error('Admin unlock user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unlock user account'
    });
  }
});

// GET /api/admin/transactions - search transactions with filters
router.get('/transactions', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      userId,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      riskLevel,
      minRiskScore,
      maxRiskScore,
      amlStatus,
      manualReview,
      hasRedFlags,
      search
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const baseFilter = {};

    if (status) {
      baseFilter.status = status;
    }

    if (type) {
      baseFilter.type = type;
    }

    if (userId) {
      baseFilter.$or = [
        { 'from.userId': userId },
        { 'to.userId': userId }
      ];
    }

    if (startDate || endDate) {
      baseFilter.createdAt = {};
      if (startDate) {
        const d = new Date(startDate);
        if (!isNaN(d.getTime())) {
          baseFilter.createdAt.$gte = d;
        }
      }
      if (endDate) {
        const d = new Date(endDate);
        if (!isNaN(d.getTime())) {
          baseFilter.createdAt.$lte = d;
        }
      }
    }

    if (riskLevel) {
      baseFilter['security.riskLevel'] = riskLevel;
    }

    if (amlStatus) {
      baseFilter['compliance.amlStatus'] = amlStatus;
    }

    if (typeof manualReview !== 'undefined') {
      if (manualReview === 'true') {
        baseFilter['compliance.manualReviewRequired'] = true;
      } else if (manualReview === 'false') {
        baseFilter['compliance.manualReviewRequired'] = false;
      }
    }

    if (hasRedFlags === 'true') {
      baseFilter['compliance.redFlags.0'] = { $exists: true };
    }

    if (search && search.trim()) {
      const pattern = new RegExp(search.trim(), 'i');
      baseFilter.$or = (baseFilter.$or || []).concat([
        { transactionId: pattern },
        { reference: pattern },
        { 'from.accountNumber': pattern },
        { 'to.accountNumber': pattern }
      ]);
    }

    const exprConditions = [];

    if (minAmount) {
      const min = parseFloat(minAmount);
      if (!isNaN(min)) {
        exprConditions.push({ $gte: [{ $toDouble: '$amount' }, min] });
      }
    }

    if (maxAmount) {
      const max = parseFloat(maxAmount);
      if (!isNaN(max)) {
        exprConditions.push({ $lte: [{ $toDouble: '$amount' }, max] });
      }
    }

    if (minRiskScore) {
      const min = parseFloat(minRiskScore);
      if (!isNaN(min)) {
        exprConditions.push({ $gte: [{ $ifNull: ['$security.riskScore', 0] }, min] });
      }
    }

    if (maxRiskScore) {
      const max = parseFloat(maxRiskScore);
      if (!isNaN(max)) {
        exprConditions.push({ $lte: [{ $ifNull: ['$security.riskScore', 0] }, max] });
      }
    }

    let mongoFilter = baseFilter;
    if (exprConditions.length > 0) {
      mongoFilter = {
        $and: [
          baseFilter,
          { $expr: { $and: exprConditions } }
        ]
      };
    }

    const query = Transaction.find(mongoFilter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize);

    const [transactions, total] = await Promise.all([
      query.exec(),
      Transaction.countDocuments(mongoFilter)
    ]);

    res.json({
      success: true,
      data: {
        items: transactions,
        pagination: {
          page: pageNum,
          limit: pageSize,
          total,
          totalPages: Math.ceil(total / pageSize) || 1
        }
      }
    });
  } catch (error) {
    console.error('Admin list transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
});

// GET /api/admin/fraud/cases - list fraud cases with filters
router.get('/fraud/cases', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      transactionId,
      userId,
      riskLevel,
      source
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (transactionId) {
      filter.transactionId = transactionId;
    }

    if (userId) {
      filter.userId = userId;
    }

    if (riskLevel) {
      filter.riskLevel = riskLevel;
    }

    if (source) {
      filter.source = source;
    }

    const query = FraudCase.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize);

    const [cases, total] = await Promise.all([
      query.exec(),
      FraudCase.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        items: cases,
        pagination: {
          page: pageNum,
          limit: pageSize,
          total,
          totalPages: Math.ceil(total / pageSize) || 1
        }
      }
    });
  } catch (error) {
    console.error('Admin list fraud cases error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fraud cases'
    });
  }
});

// POST /api/admin/fraud/cases - create a fraud case
router.post('/fraud/cases', async (req, res) => {
  try {
    const {
      transactionId,
      userId,
      riskScore,
      riskLevel,
      flags,
      source,
      notes
    } = req.body || {};

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: 'transactionId is required'
      });
    }

    const payload = {
      transactionId,
      userId,
      riskScore,
      riskLevel,
      flags,
      source: source || 'manual',
      notes,
      createdBy: req.user?.userId || null
    };

    const fraudCase = await FraudCase.create(payload);

    res.status(201).json({
      success: true,
      data: fraudCase
    });
  } catch (error) {
    console.error('Admin create fraud case error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create fraud case'
    });
  }
});

// PATCH /api/admin/fraud/cases/:id - update fraud case (status, notes, assignment)
router.patch('/fraud/cases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, assignedTo } = req.body || {};

    const update = {};

    if (status) {
      update.status = status;
    }

    if (typeof notes === 'string') {
      update.notes = notes;
    }

    if (assignedTo) {
      update.assignedTo = assignedTo;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No update fields provided'
      });
    }

    const fraudCase = await FraudCase.findByIdAndUpdate(id, update, { new: true });

    if (!fraudCase) {
      return res.status(404).json({
        success: false,
        error: 'Fraud case not found'
      });
    }

    res.json({
      success: true,
      data: fraudCase
    });
  } catch (error) {
    console.error('Admin update fraud case error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update fraud case'
    });
  }
});

// GET /api/admin/compliance/kyc-summary - KYC status summary
router.get('/compliance/kyc-summary', async (req, res) => {
  try {
    const [
      totalUsers,
      tier1,
      tier2,
      tier3,
      bvnVerified,
      addressVerified,
      utilityBillVerified
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ 'kyc.tier': 1 }),
      User.countDocuments({ 'kyc.tier': 2 }),
      User.countDocuments({ 'kyc.tier': 3 }),
      User.countDocuments({ 'kyc.bvnVerified': true }),
      User.countDocuments({ 'kyc.addressVerified': true }),
      User.countDocuments({ 'kyc.utilityBill.verified': true })
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        tiers: {
          tier1,
          tier2,
          tier3
        },
        verification: {
          bvnVerified,
          addressVerified,
          utilityBillVerified
        }
      }
    });
  } catch (error) {
    console.error('Admin KYC summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch KYC summary'
    });
  }
});

// GET /api/admin/compliance/aml-summary - AML/transaction compliance summary
router.get('/compliance/aml-summary', async (req, res) => {
  try {
    const [
      totalTransactions,
      amlClear,
      amlReview,
      amlFlagged,
      amlReported,
      reportedToNFIU,
      manualReviewRequired,
      highRiskTransactions
    ] = await Promise.all([
      Transaction.countDocuments({}),
      Transaction.countDocuments({ 'compliance.amlStatus': 'clear' }),
      Transaction.countDocuments({ 'compliance.amlStatus': 'review' }),
      Transaction.countDocuments({ 'compliance.amlStatus': 'flagged' }),
      Transaction.countDocuments({ 'compliance.amlStatus': 'reported' }),
      Transaction.countDocuments({ 'compliance.reportedToNFIU': true }),
      Transaction.countDocuments({ 'compliance.manualReviewRequired': true }),
      Transaction.countDocuments({ 'security.riskLevel': { $in: ['high', 'critical'] } })
    ]);

    res.json({
      success: true,
      data: {
        totalTransactions,
        amlStatus: {
          clear: amlClear,
          review: amlReview,
          flagged: amlFlagged,
          reported: amlReported
        },
        flags: {
          reportedToNFIU,
          manualReviewRequired,
          highRiskTransactions
        }
      }
    });
  } catch (error) {
    console.error('Admin AML summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AML summary'
    });
  }
});

// GET /api/admin/compliance/sar-report - Suspicious Activity Report export
router.get('/compliance/sar-report', async (req, res) => {
  try {
    const { startDate, endDate, reportType = 'SAR' } = req.query;

    const params = {
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      reportType
    };

    const report = await complianceService.generateComplianceReport(params);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Admin SAR report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate SAR report'
    });
  }
});

// GET /api/admin/analytics/latest/:symbol - latest analytics snapshot
router.get('/analytics/latest/:symbol', async (req, res) => {
  try {
    const symbol = (req.params.symbol || '').toUpperCase();
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'symbol is required' });
    }
    const snapshot = await require('../models/InstrumentAnalytics')
      .findOne({ symbol })
      .sort({ asOfDate: -1 })
      .lean();

    if (!snapshot) {
      return res.status(404).json({ success: false, error: 'No analytics found for symbol' });
    }

    res.json({ success: true, data: snapshot });
  } catch (err) {
    console.error('Admin analytics latest error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

router.patch('/providers/primary', async (req, res) => {
  try {
    const { provider } = req.body || {}
    const p = await providerHealth.setPrimary(provider)
    res.json({ success: true, data: { primary: p } })
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to set primary provider' })
  }
})

router.post('/cache/verification/invalidate', async (req, res) => {
  try {
    const { bankCode, accountNumber, all } = req.body || {}
    let deleted = 0
    if (all) {
      const keys = await redisService.getKeys('bank_verif:*')
      for (const k of keys) { try { await redisService.delete(k); deleted++ } catch (e) {} }
      return res.json({ success: true, data: { deleted } })
    }
    if (!bankCode || !accountNumber) {
      return res.status(400).json({ success: false, error: 'bankCode and accountNumber required unless all=true' })
    }
    const key = `bank_verif:ng:${bankCode}:${accountNumber}`
    await redisService.delete(key)
    deleted = 1
    res.json({ success: true, data: { deleted, key } })
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to invalidate cache' })
  }
})

router.get('/reconcile/providers', async (req, res) => {
  try {
    const paystack = require('../services/paystackService')
    const { perPage = 50, page = 1, from, to, status } = req.query
    const txs = await paystack.getTransactions({ perPage: Number(perPage), page: Number(page), from, to, status })
    const items = Array.isArray(txs?.data) ? txs.data : []
    const mismatches = []
    for (const t of items) {
      const ref = t?.reference || t?.id
      if (!ref) continue
      const local = await Transaction.findOne({ reference: ref }).lean()
      if (!local) {
        mismatches.push({ reference: ref, providerStatus: t?.status, reason: 'missing_local' })
        continue
      }
      const localStatus = local.status
      const providerStatus = t?.status
      if (localStatus !== providerStatus) {
        mismatches.push({ reference: ref, localStatus, providerStatus, reason: 'status_diff' })
      }
    }
    res.json({ success: true, data: { provider: 'paystack', count: items.length, mismatches } })
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to run reconciliation' })
  }
})

router.get('/reconcile/paystack/summary', async (req, res) => {
  try {
    const paystack = require('../services/paystackService')
    const { perPage = 50, page = 1, from, to, status } = req.query
    const txs = await paystack.getTransactions({ perPage: Number(perPage), page: Number(page), from, to, status })
    const items = Array.isArray(txs?.data) ? txs.data : []
    let providerSuccess = 0, providerFailed = 0
    let refunds = 0
    for (const t of items) {
      const s = (t?.status || '').toLowerCase()
      if (s.includes('success')) providerSuccess++
      else if (s.includes('fail')) providerFailed++
      if ((t?.channel || '').toLowerCase().includes('refund')) refunds++
    }
    const mismatches = []
    for (const t of items) {
      const ref = t?.reference || t?.id
      if (!ref) continue
      const local = await Transaction.findOne({ $or: [ { 'gateway.reference': String(ref) }, { transactionId: String(ref) } ] })
      const providerStatus = t?.status
      const localStatus = local?.status
      if (!local) {
        mismatches.push({ reference: ref, providerStatus, reason: 'missing_local' })
        continue
      }
      if (localStatus !== providerStatus) {
        mismatches.push({ reference: ref, localStatus, providerStatus, reason: 'status_diff' })
      }
    }
    res.json({ success: true, data: { counts: { providerSuccess, providerFailed, refunds }, mismatches } })
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to run summary reconciliation' })
  }
})

router.get('/reconcile/flutterwave/summary', async (req, res) => {
  try {
    const flutterwave = require('../services/flutterwaveService')
    const { page = 1, from, to, status } = req.query
    const txs = await flutterwave.listTransactions({ page: Number(page), from, to, status })
    const items = Array.isArray(txs?.data) ? txs.data : []
    let providerSuccess = 0, providerFailed = 0
    let refunds = 0
    for (const t of items) {
      const s = (t?.status || '').toLowerCase()
      if (s.includes('successful')) providerSuccess++
      else if (s.includes('failed')) providerFailed++
      if ((t?.processor_response || '').toLowerCase().includes('refund')) refunds++
    }
    const mismatches = []
    for (const t of items) {
      const ref = t?.tx_ref || t?.flw_ref || t?.id
      if (!ref) continue
      const providerStatus = t?.status
      const local = await require('../models/Transaction').findOne({ $or: [ { 'gateway.reference': String(ref) }, { transactionId: String(ref) } ] })
      const localStatus = local?.status
      if (!local) {
        mismatches.push({ reference: ref, providerStatus, reason: 'missing_local' })
        continue
      }
      if (localStatus !== providerStatus) {
        mismatches.push({ reference: ref, localStatus, providerStatus, reason: 'status_diff' })
      }
    }
    res.json({ success: true, data: { counts: { providerSuccess, providerFailed, refunds }, mismatches } })
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to run summary reconciliation' })
  }
})

router.get('/reconcile/paystack/settlement', async (req, res) => {
  try {
    const paystack = require('../services/paystackService')
    const postgresService = require('../services/postgresService')
    const { date, from, to, status = 'success', page = 1, perPage = 100 } = req.query
    let fromStr = from, toStr = to
    if (date && (!fromStr || !toStr)) {
      const d = new Date(date)
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0))
      const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59))
      fromStr = start.toISOString().slice(0, 19).replace('T', ' ')
      toStr = end.toISOString().slice(0, 19).replace('T', ' ')
    }

    const providerRes = await paystack.getTransactions({ perPage: Number(perPage), page: Number(page), from: fromStr, to: toStr, status })
    const items = Array.isArray(providerRes?.data) ? providerRes.data : []

    let providerCompleted = 0, providerFailed = 0
    let providerSum = 0
    const mismatches = []

    for (const t of items) {
      const s = (t?.status || '').toLowerCase()
      const amt = Number(t?.amount || 0)
      if (s.includes('success')) { providerCompleted++; providerSum += amt }
      else if (s.includes('fail')) providerFailed++
      const ref = t?.reference || t?.transfer_code || t?.id
      if (!ref) continue
      const gwRef = `gw:paystack:${String(ref)}`
      const row = await postgresService.query(
        `SELECT status, amount FROM transactions WHERE reference = $1 ORDER BY id DESC LIMIT 1`,
        [gwRef]
      )
      const local = row.rows[0]
      if (!local) {
        mismatches.push({ reference: ref, providerStatus: t?.status, reason: 'missing_local' })
      } else if (String(local.status).toUpperCase() !== 'COMPLETED' && s.includes('success')) {
        mismatches.push({ reference: ref, localStatus: local.status, providerStatus: t?.status, reason: 'status_diff' })
      }
    }

    const ledgerDay = await postgresService.query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(amount),0) AS sum
       FROM transactions
       WHERE reference LIKE 'gw:paystack:%'
         AND status = 'COMPLETED'
         ${fromStr && toStr ? 'AND created_at BETWEEN $1 AND $2' : ''}`,
      fromStr && toStr ? [fromStr, toStr] : []
    )

    res.json({
      success: true,
      data: {
        provider: { completed: providerCompleted, failed: providerFailed, amountSum: providerSum },
        ledger: { completed: Number(ledgerDay.rows[0]?.count || 0), amountSum: Number(ledgerDay.rows[0]?.sum || 0) },
        mismatches
      }
    })
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to run paystack settlement reconciliation' })
  }
})

router.get('/reconcile/flutterwave/settlement', async (req, res) => {
  try {
    const flutterwave = require('../services/flutterwaveService')
    const postgresService = require('../services/postgresService')
    const { date, from, to, status = 'successful', page = 1 } = req.query
    let fromStr = from, toStr = to
    if (date && (!fromStr || !toStr)) {
      const d = new Date(date)
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0))
      const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59))
      fromStr = start.toISOString()
      toStr = end.toISOString()
    }

    const providerRes = await flutterwave.listTransactions({ page: Number(page), from: fromStr, to: toStr, status })
    const items = Array.isArray(providerRes?.data) ? providerRes.data : []
    let providerCompleted = 0, providerFailed = 0
    let providerSum = 0
    const mismatches = []
    for (const t of items) {
      const s = (t?.status || '').toLowerCase()
      const amt = Number(t?.amount || 0)
      if (s.includes('successful')) { providerCompleted++; providerSum += amt }
      else if (s.includes('failed')) providerFailed++
      const ref = t?.tx_ref || t?.flw_ref || t?.id
      if (!ref) continue
      const gwRef = `gw:flutterwave:${String(ref)}`
      const row = await postgresService.query(
        `SELECT status, amount FROM transactions WHERE reference = $1 ORDER BY id DESC LIMIT 1`,
        [gwRef]
      )
      const local = row.rows[0]
      if (!local) {
        mismatches.push({ reference: ref, providerStatus: t?.status, reason: 'missing_local' })
      } else if (String(local.status).toUpperCase() !== 'COMPLETED' && s.includes('successful')) {
        mismatches.push({ reference: ref, localStatus: local.status, providerStatus: t?.status, reason: 'status_diff' })
      }
    }

    const ledgerDay = await postgresService.query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(amount),0) AS sum
       FROM transactions
       WHERE reference LIKE 'gw:flutterwave:%'
         AND status = 'COMPLETED'
         ${fromStr && toStr ? 'AND created_at BETWEEN $1 AND $2' : ''}`,
      fromStr && toStr ? [fromStr, toStr] : []
    )

    res.json({
      success: true,
      data: {
        provider: { completed: providerCompleted, failed: providerFailed, amountSum: providerSum },
        ledger: { completed: Number(ledgerDay.rows[0]?.count || 0), amountSum: Number(ledgerDay.rows[0]?.sum || 0) },
        mismatches
      }
    })
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to run flutterwave settlement reconciliation' })
  }
})

module.exports = router;
