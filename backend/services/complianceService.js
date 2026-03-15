const SuspiciousActivityReport = require('../models/SuspiciousActivityReport');
const crypto = require('crypto');

class ComplianceService {
  constructor() {
    // CBN Transaction Limits (standardized to Tiers)
    this.limits = {
      // Tier 1 (BVN/NIN mandatory per Dec 2023 CBN Circular)
      tier1: {
        dailyLimit: 50000, // ₦50,000
        cumulativeBalance: 300000, // ₦300,000
        requiresBVN: true, // Updated from false
        requiresAddress: false
      },
      // Tier 2 (Full identity verification)
      tier2: {
        dailyLimit: 200000, // ₦200,000
        cumulativeBalance: 500000, // ₦500,000
        requiresBVN: true,
        requiresAddress: false
      },
      // Tier 3 (Full KYC + Address verification)
      tier3: {
        dailyLimit: 5000000, // ₦5,000,000
        cumulativeBalance: null, // No limit
        requiresBVN: true,
        requiresAddress: true,
        requiresUtilityBill: true
      }
    };

    // AML thresholds
    this.amlThresholds = {
      singleTransactionReport: 5000000, // ₦5M - Report to NFIU
      dailyAggregateReport: 10000000, // ₦10M - Report cumulative
      cashTransactionReport: 5000000, // ₦5M cash
      internationalTransfer: 10000 // $10,000 USD
    };

    // Restricted countries (FATF blacklist + Nigeria-specific)
    this.restrictedCountries = [
      'KP', // North Korea
      'IR', // Iran
      'MM', // Myanmar
      'SY'  // Syria
      // Add more as per CBN guidelines
    ];

    // High-risk transaction patterns
    this.highRiskPatterns = {
      rapidSuccessiveTransfers: 5, // 5 transfers in 10 minutes
      roundAmountThreshold: 1000000, // Round amounts > ₦1M
      structuring: { // Breaking large amounts into smaller ones
        count: 3,
        timeWindow: 24 * 60 * 60 * 1000, // 24 hours
        totalThreshold: 5000000
      }
    };
  }

  /**
   * Determine user's KYC tier
   * @param {Object} user - User object
   * @returns {number} - Tier level (1, 2, or 3)
   */
  getUserTier(user) {
    if (!user.kyc) return 1;

    const { bvnVerified, addressVerified, utilityBillVerified } = user.kyc;

    if (bvnVerified && addressVerified && utilityBillVerified) {
      return 3; // Full KYC
    } else if (bvnVerified) {
      return 2; // BVN linked
    }

    return 1; // Basic
  }

  /**
   * Check if transaction complies with CBN limits
   * @param {Object} params - Transaction parameters
   * @returns {Object} - Compliance check result
   */
  async checkTransactionLimits(params) {
    const { userId, amount, userTier, dailyTotal, accountBalance } = params;

    const tierLimits = this.limits[`tier${userTier}`];
    const violations = [];
    let allowed = true;

    // Check daily limit
    if (dailyTotal + amount > tierLimits.dailyLimit) {
      violations.push({
        type: 'DAILY_LIMIT_EXCEEDED',
        message: `Daily limit of ₦${tierLimits.dailyLimit.toLocaleString()} exceeded`,
        limit: tierLimits.dailyLimit,
        current: dailyTotal,
        attempted: amount
      });
      allowed = false;
    }

    // Check cumulative balance limit (Tier 1 & 2)
    if (tierLimits.cumulativeBalance && accountBalance > tierLimits.cumulativeBalance) {
      violations.push({
        type: 'CUMULATIVE_BALANCE_EXCEEDED',
        message: `Account balance limit of ₦${tierLimits.cumulativeBalance.toLocaleString()} exceeded`,
        limit: tierLimits.cumulativeBalance,
        current: accountBalance
      });
      allowed = false;
    }

    // Check if upgrade needed
    const upgradeRecommendation = this.getUpgradeRecommendation(userTier, violations);

    return {
      allowed,
      violations,
      currentTier: userTier,
      tierLimits,
      upgradeRecommendation,
      message: allowed
        ? 'Transaction within limits'
        : 'Transaction exceeds CBN limits'
    };
  }

  /**
   * Get KYC upgrade recommendation
   * @param {number} currentTier - Current tier
   * @param {Array} violations - Violations
   * @returns {Object|null}
   */
  getUpgradeRecommendation(currentTier, violations) {
    if (violations.length === 0 || currentTier === 3) {
      return null;
    }

    const nextTier = currentTier + 1;
    const nextLimits = this.limits[`tier${nextTier}`];

    return {
      recommendedTier: nextTier,
      benefits: {
        dailyLimit: nextLimits.dailyLimit,
        cumulativeBalance: nextLimits.cumulativeBalance || 'Unlimited'
      },
      requirements: this.getTierRequirements(nextTier),
      message: `Upgrade to Tier ${nextTier} for higher limits`
    };
  }

  /**
   * Get requirements for tier
   * @param {number} tier - Tier level
   * @returns {Array}
   */
  getTierRequirements(tier) {
    const requirements = {
      2: [
        'Link your Bank Verification Number (BVN)',
        'Verify your phone number'
      ],
      3: [
        'Link your BVN',
        'Verify your residential address',
        'Upload utility bill (not older than 3 months)',
        'Provide valid ID (National ID, Driver\'s License, or Passport)'
      ]
    };

    return requirements[tier] || [];
  }

  /**
   * Check for AML/CFT red flags
   * @param {Object} transaction - Transaction details
   * @param {Object} userHistory - User's transaction history
   * @returns {Object}
   */
  async checkAMLCompliance(transaction, userHistory) {
    const { amount, type, destination, userId } = transaction;
    const redFlags = [];
    let riskLevel = 'low';
    let requiresReporting = false;

    // Check single transaction threshold
    if (amount >= this.amlThresholds.singleTransactionReport) {
      redFlags.push({
        type: 'HIGH_VALUE_TRANSACTION',
        severity: 'high',
        message: `Transaction exceeds ₦${this.amlThresholds.singleTransactionReport.toLocaleString()} reporting threshold`,
        action: 'REPORT_TO_NFIU'
      });
      requiresReporting = true;
      riskLevel = 'high';
    }

    // Check for structuring (smurfing)
    const structuringDetected = this.detectStructuring(amount, userHistory);
    if (structuringDetected.detected) {
      redFlags.push({
        type: 'POSSIBLE_STRUCTURING',
        severity: 'high',
        message: 'Possible attempt to avoid reporting thresholds',
        details: structuringDetected,
        action: 'MANUAL_REVIEW'
      });
      riskLevel = 'high';
    }

    // Check for rapid successive transfers
    const rapidTransfers = this.detectRapidTransfers(userHistory);
    if (rapidTransfers.detected) {
      redFlags.push({
        type: 'RAPID_TRANSFERS',
        severity: 'medium',
        message: 'Multiple transfers in short time period',
        details: rapidTransfers
      });
      riskLevel = riskLevel === 'high' ? 'high' : 'medium';
    }

    // Check for round amounts (potential money laundering indicator)
    if (this.isRoundAmount(amount) && amount >= this.highRiskPatterns.roundAmountThreshold) {
      redFlags.push({
        type: 'ROUND_AMOUNT',
        severity: 'low',
        message: 'Large round amount transaction',
        amount
      });
    }

    // Check restricted countries
    if (destination?.country && this.restrictedCountries.includes(destination.country)) {
      redFlags.push({
        type: 'RESTRICTED_COUNTRY',
        severity: 'critical',
        message: `Transaction to restricted country: ${destination.country}`,
        action: 'BLOCK_TRANSACTION'
      });
      riskLevel = 'critical';
    }

    const result = {
      compliant: riskLevel !== 'critical',
      riskLevel,
      redFlags,
      requiresReporting,
      requiresManualReview: riskLevel === 'high' || riskLevel === 'critical',
      message: redFlags.length > 0
        ? `${redFlags.length} AML red flag(s) detected`
        : 'No AML concerns'
    };

    // Automate STR creation if reporting is required
    if (requiresReporting || riskLevel === 'high' || riskLevel === 'critical') {
      await this.autoGenerateSTR(transaction, result);
    }

    return result;
  }

  /**
   * Automatically generate Suspicious Transaction Report (STR)
   * @param {Object} transaction - The flagged transaction
   * @param {Object} complianceResult - Results from aml check
   */
  async autoGenerateSTR(transaction, complianceResult) {
    try {
      const reportId = `STR-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now()}`;

      const sar = new SuspiciousActivityReport({
        reportId,
        transactionId: transaction._id || transaction.id,
        userId: transaction.userId || transaction.from?.userId,
        redFlags: complianceResult.redFlags,
        riskLevel: complianceResult.riskLevel,
        status: 'pending_review',
        comments: `Auto-generated due to ${complianceResult.redFlags[0]?.type || 'AML flags'}`
      });

      await sar.save();

      // Log for audit trail
      await this.logComplianceEvent({
        type: 'STR_AUTO_GENERATED',
        severity: complianceResult.riskLevel,
        userId: transaction.userId || transaction.from?.userId,
        transactionId: transaction._id || transaction.id,
        details: { reportId, flags: complianceResult.redFlags.map(f => f.type) },
        action: 'CREATED_SAR_DRAFT'
      });

      return sar;
    } catch (error) {
      console.error('❌ Failed to auto-generate STR:', error);
    }
  }

  /**
   * Detect structuring (breaking large amounts into smaller ones)
   * @param {number} amount - Current transaction amount
   * @param {Object} userHistory - User history
   * @returns {Object}
   */
  detectStructuring(amount, userHistory) {
    const { recentTransactions = [] } = userHistory;
    const pattern = this.highRiskPatterns.structuring;
    const now = Date.now();

    // Get transactions in time window
    const recentInWindow = recentTransactions.filter(tx =>
      now - new Date(tx.timestamp).getTime() < pattern.timeWindow
    );

    // Check if multiple similar amounts sum to threshold
    const total = recentInWindow.reduce((sum, tx) => sum + tx.amount, 0) + amount;
    const count = recentInWindow.length + 1;

    const detected = count >= pattern.count && total >= pattern.totalThreshold;

    return {
      detected,
      count,
      total,
      timeWindow: pattern.timeWindow / (1000 * 60 * 60), // hours
      message: detected
        ? `${count} transactions totaling ₦${total.toLocaleString()} in ${pattern.timeWindow / (1000 * 60 * 60)} hours`
        : null
    };
  }

  /**
   * Detect rapid successive transfers
   * @param {Object} userHistory - User history
   * @returns {Object}
   */
  detectRapidTransfers(userHistory) {
    const { recentTransactions = [] } = userHistory;
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    const recentRapid = recentTransactions.filter(tx =>
      now - new Date(tx.timestamp).getTime() < tenMinutes
    );

    const detected = recentRapid.length >= this.highRiskPatterns.rapidSuccessiveTransfers;

    return {
      detected,
      count: recentRapid.length,
      threshold: this.highRiskPatterns.rapidSuccessiveTransfers,
      timeWindow: '10 minutes'
    };
  }

  /**
   * Check if amount is suspiciously round
   * @param {number} amount - Amount
   * @returns {boolean}
   */
  isRoundAmount(amount) {
    // Check if divisible by 100,000 or 1,000,000
    return amount % 100000 === 0 || amount % 1000000 === 0;
  }

  /**
   * Check NDPR (Nigerian Data Protection Regulation) compliance
   * @param {Object} dataOperation - Data operation details
   * @returns {Object}
   */
  checkNDPRCompliance(dataOperation) {
    const { type, data, userConsent, purpose } = dataOperation;
    const violations = [];
    let compliant = true;

    // Check for user consent
    if (!userConsent) {
      violations.push({
        type: 'NO_CONSENT',
        message: 'User consent required for data processing',
        regulation: 'NDPR Article 2.1'
      });
      compliant = false;
    }

    // Check for legitimate purpose
    if (!purpose || purpose === '') {
      violations.push({
        type: 'NO_PURPOSE',
        message: 'Legitimate purpose required for data collection',
        regulation: 'NDPR Article 2.2'
      });
      compliant = false;
    }

    // Check for sensitive data
    const sensitiveFields = ['bvn', 'nin', 'passport', 'medicalInfo'];
    const hasSensitiveData = sensitiveFields.some(field => data[field]);

    if (hasSensitiveData && !userConsent?.sensitiveData) {
      violations.push({
        type: 'SENSITIVE_DATA_NO_CONSENT',
        message: 'Explicit consent required for sensitive data',
        regulation: 'NDPR Article 2.3'
      });
      compliant = false;
    }

    return {
      compliant,
      violations,
      requiresExplicitConsent: hasSensitiveData,
      message: compliant ? 'NDPR compliant' : 'NDPR violations detected'
    };
  }

  /**
   * Generate compliance report for regulatory submission
   * @param {Object} params - Report parameters
   * @returns {Object}
   */
  async generateComplianceReport(params) {
    const { startDate, endDate, reportType } = params;

    const query = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    const sars = await SuspiciousActivityReport.find(query)
      .populate('transactionId')
      .populate('userId', 'firstName lastName email kyc.tier');

    const report = {
      reportType,
      period: { startDate, endDate },
      generatedAt: new Date().toISOString(),
      summary: {
        totalFlagged: sars.length,
        reported: sars.filter(s => s.status === 'reported').length,
        pendingReview: sars.filter(s => s.status === 'pending_review').length,
        criticalRisk: sars.filter(s => s.riskLevel === 'critical').length
      },
      details: sars.map(sar => ({
        reportId: sar.reportId,
        transactionId: sar.transactionId?.transactionId,
        user: sar.userId?.email,
        risk: sar.riskLevel,
        status: sar.status,
        flags: sar.redFlags.map(f => f.type)
      })),
      compliance: {
        cbnCompliance: 'COMPLIANT',
        ndprCompliance: 'COMPLIANT',
        amlCompliance: 'COMPLIANT'
      }
    };

    return report;
  }

  /**
   * Generate goAML XML for NFIU submission
   * @param {string} sarId - ID of the Suspicious Activity Report
   * @returns {string} XML string
   */
  async generateGoAmlXml(sarId) {
    const sar = await SuspiciousActivityReport.findById(sarId)
      .populate('transactionId')
      .populate('userId');

    if (!sar) throw new Error('SAR not found');

    // Simple goAML XML structure placeholder
    const xml = `
<?xml version="1.0" encoding="UTF-8"?>
<report>
  <report_indicators>
    ${sar.redFlags.map(f => `<indicator>${f.type}</indicator>`).join('\n    ')}
  </report_indicators>
  <transaction>
    <transaction_number>${sar.transactionId?.transactionId}</transaction_number>
    <date_transaction>${sar.transactionId?.createdAt.toISOString()}</date_transaction>
    <amount>${sar.transactionId?.amount}</amount>
    <currency>${sar.transactionId?.currency}</currency>
  </transaction>
  <reason>${sar.comments}</reason>
</report>`.trim();

    sar.goAmlXml = xml;
    sar.status = 'reported';
    sar.nfiu.submittedAt = new Date();
    await sar.save();

    return xml;
  }

  /**
   * Log compliance event for audit trail
   * @param {Object} event - Compliance event
   */
  async logComplianceEvent(event) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: event.type,
      severity: event.severity || 'info',
      userId: event.userId,
      transactionId: event.transactionId,
      details: event.details,
      action: event.action,
      officer: event.officer || 'SYSTEM'
    };

    // In production, store in audit log database
    console.log('📋 Compliance Event:', logEntry);

    return logEntry;
  }
}

module.exports = new ComplianceService();
