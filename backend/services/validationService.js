/**
 * Transaction Validation Service
 * Implements fraud detection, compliance checks, and risk scoring
 * Enforces CBN regulations, NDPR, and AML/KYC requirements
 */

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const complianceService = require('./complianceService');
const logger = require('../utils/logger');
const Decimal = require('decimal.js');

class ValidationService {
  constructor() {
    // Fraud detection thresholds
    this.fraudThresholds = {
      velocityCheck: {
        maxTransactionsPerHour: 10,
        maxTransactionsPerDay: 50,
        maxAmountPerHour: 500000, // ₦500k
        maxAmountPerDay: 2000000  // ₦2M
      },
      behavioralAnalysis: {
        unusualAmountMultiplier: 3, // 3x average transaction
        unusualTimeWindow: 2,        // 2 AM - 6 AM
        unusualLocationRadius: 100   // km
      },
      riskScoring: {
        lowRisk: 30,
        mediumRisk: 60,
        highRisk: 80,
        criticalRisk: 95
      }
    };

    // Transaction fees
    this.fees = {
      transfer: {
        sameBank: 0,
        otherBank: 50,
        international: 500
      },
      billPayment: 0,
      airtime: 0
    };
  }

  /**
   * Validate transfer transaction
   */
  async validateTransfer(data) {
    try {
      const { userId, amount, recipientAccount, recipientName, sourceAccount } = data;

      // Get user
      const user = await User.findById(userId).select('+accounts +security +kyc');
      if (!user) {
        return {
          isValid: false,
          error: 'User not found'
        };
      }

      // Basic validations
      const basicValidation = this.validateBasicTransferData(data);
      if (!basicValidation.isValid) {
        return basicValidation;
      }

      // Check account balance
      const sourceAcc = user.accounts.find(acc => acc.accountNumber === sourceAccount);
      if (!sourceAcc) {
        return {
          isValid: false,
          error: 'Source account not found'
        };
      }

      const fee = this.fees.transfer.sameBank; // Simplified
      const total = new Decimal(amount).plus(fee);

      if (new Decimal(sourceAcc.balance).lessThan(total)) {
        return {
          isValid: false,
          error: 'Insufficient balance',
          required: total.toNumber(),
          available: sourceAcc.balance
        };
      }

      // Compliance checks
      const complianceCheck = await complianceService.validateTransaction({
        userId: user._id,
        amount,
        type: 'transfer',
        userTier: user.kyc?.tier || 1,
        recipientCountry: 'NG'
      });

      if (!complianceCheck.allowed) {
        return {
          isValid: false,
          error: complianceCheck.reason,
          complianceIssue: true,
          riskLevel: 'critical'
        };
      }

      // Fraud detection
      const fraudCheck = await this.detectFraud({
        user,
        amount,
        type: 'transfer',
        recipient: recipientAccount,
        metadata: data
      });

      // Risk assessment
      const riskLevel = this.assessRiskLevel(fraudCheck.riskScore);

      // Security checks
      const securityChecks = {
        velocityCheck: fraudCheck.velocityCheck,
        behavioralAnalysis: fraudCheck.behavioralAnalysis,
        complianceCheck: complianceCheck.checks,
        anomalyDetection: fraudCheck.anomalies
      };

      return {
        isValid: true,
        fee,
        total: total.toNumber(),
        riskLevel,
        riskScore: fraudCheck.riskScore,
        securityChecks,
        requiresAdditionalAuth: riskLevel === 'high' || riskLevel === 'critical',
        complianceFlags: complianceCheck.flags || []
      };

    } catch (error) {
      logger.error('Error validating transfer:', error);
      return {
        isValid: false,
        error: 'Validation failed'
      };
    }
  }

  /**
   * Validate bill payment
   */
  async validateBillPayment(data) {
    try {
      const { userId, billType, amount, provider, accountNumber, phoneNumber } = data;

      // Get user
      const user = await User.findById(userId).select('+accounts +security +kyc');
      if (!user) {
        return {
          isValid: false,
          error: 'User not found'
        };
      }

      // Basic validations
      if (!billType || !amount) {
        return {
          isValid: false,
          error: 'Bill type and amount are required'
        };
      }

      if (amount <= 0) {
        return {
          isValid: false,
          error: 'Amount must be greater than zero'
        };
      }

      // Check balance
      const account = user.accounts[0]; // Default account
      const fee = this.fees.billPayment;
      const total = new Decimal(amount).plus(fee);

      if (new Decimal(account.balance).lessThan(total)) {
        return {
          isValid: false,
          error: 'Insufficient balance',
          required: total.toNumber(),
          available: account.balance
        };
      }

      // Compliance check
      const complianceCheck = await complianceService.validateTransaction({
        userId: user._id,
        amount,
        type: 'bill_payment',
        userTier: user.kyc?.tier || 1
      });

      if (!complianceCheck.allowed) {
        return {
          isValid: false,
          error: complianceCheck.reason,
          complianceIssue: true
        };
      }

      // Fraud detection
      const fraudCheck = await this.detectFraud({
        user,
        amount,
        type: 'bill_payment',
        metadata: data
      });

      const riskLevel = this.assessRiskLevel(fraudCheck.riskScore);

      return {
        isValid: true,
        fee,
        total: total.toNumber(),
        riskLevel,
        riskScore: fraudCheck.riskScore,
        securityChecks: {
          velocityCheck: fraudCheck.velocityCheck,
          complianceCheck: complianceCheck.checks
        }
      };

    } catch (error) {
      logger.error('Error validating bill payment:', error);
      return {
        isValid: false,
        error: 'Validation failed'
      };
    }
  }

  /**
   * Validate airtime purchase
   */
  async validateAirtimePurchase(data) {
    try {
      const { userId, amount, phoneNumber, network } = data;

      // Get user
      const user = await User.findById(userId).select('+accounts +security');
      if (!user) {
        return {
          isValid: false,
          error: 'User not found'
        };
      }

      // Basic validations
      if (!amount || !phoneNumber) {
        return {
          isValid: false,
          error: 'Amount and phone number are required'
        };
      }

      if (amount < 50 || amount > 50000) {
        return {
          isValid: false,
          error: 'Airtime amount must be between ₦50 and ₦50,000'
        };
      }

      // Validate phone number
      const phoneRegex = /^0[789][01]\d{8}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return {
          isValid: false,
          error: 'Invalid Nigerian phone number'
        };
      }

      // Check balance
      const account = user.accounts[0];
      const fee = this.fees.airtime;
      const total = new Decimal(amount).plus(fee);

      if (new Decimal(account.balance).lessThan(total)) {
        return {
          isValid: false,
          error: 'Insufficient balance'
        };
      }

      // Fraud detection
      const fraudCheck = await this.detectFraud({
        user,
        amount,
        type: 'airtime',
        metadata: data
      });

      const riskLevel = this.assessRiskLevel(fraudCheck.riskScore);

      return {
        isValid: true,
        fee,
        total: total.toNumber(),
        riskLevel,
        riskScore: fraudCheck.riskScore
      };

    } catch (error) {
      logger.error('Error validating airtime purchase:', error);
      return {
        isValid: false,
        error: 'Validation failed'
      };
    }
  }

  /**
   * Comprehensive fraud detection
   */
  async detectFraud(data) {
    const { user, amount, type, recipient, metadata } = data;
    
    let riskScore = 0;
    const anomalies = [];

    // 1. Velocity check
    const velocityCheck = await this.performVelocityCheck(user._id, amount);
    if (!velocityCheck.passed) {
      riskScore += 30;
      anomalies.push({
        type: 'velocity_exceeded',
        severity: 'high',
        details: velocityCheck.details
      });
    }

    // 2. Behavioral analysis
    const behavioralCheck = this.analyzeBehavior(user, amount, type);
    riskScore += behavioralCheck.riskScore;
    if (behavioralCheck.anomalies.length > 0) {
      anomalies.push(...behavioralCheck.anomalies);
    }

    // 3. Amount analysis
    const amountCheck = await this.analyzeAmount(user._id, amount);
    riskScore += amountCheck.riskScore;
    if (amountCheck.unusual) {
      anomalies.push({
        type: 'unusual_amount',
        severity: 'medium',
        details: amountCheck.details
      });
    }

    // 4. Time-based analysis
    const timeCheck = this.analyzeTransactionTime();
    riskScore += timeCheck.riskScore;
    if (timeCheck.unusual) {
      anomalies.push({
        type: 'unusual_time',
        severity: 'low',
        details: timeCheck.details
      });
    }

    // 5. Device and location check
    const deviceCheck = this.analyzeDevice(user, metadata);
    riskScore += deviceCheck.riskScore;
    if (deviceCheck.anomalies.length > 0) {
      anomalies.push(...deviceCheck.anomalies);
    }

    // 6. Recipient analysis (for transfers)
    if (recipient) {
      const recipientCheck = await this.analyzeRecipient(user._id, recipient);
      riskScore += recipientCheck.riskScore;
      if (recipientCheck.suspicious) {
        anomalies.push({
          type: 'suspicious_recipient',
          severity: 'high',
          details: recipientCheck.details
        });
      }
    }

    return {
      riskScore: Math.min(riskScore, 100),
      velocityCheck,
      behavioralAnalysis: behavioralCheck,
      anomalies,
      timestamp: new Date()
    };
  }

  /**
   * Velocity check - detect rapid transactions
   */
  async performVelocityCheck(userId, amount) {
    const now = new Date();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    // Get recent transactions
    const hourlyTxs = await Transaction.find({
      userId,
      createdAt: { $gte: oneHourAgo },
      status: { $in: ['completed', 'pending'] }
    });

    const dailyTxs = await Transaction.find({
      userId,
      createdAt: { $gte: oneDayAgo },
      status: { $in: ['completed', 'pending'] }
    });

    // Calculate totals
    const hourlyCount = hourlyTxs.length;
    const dailyCount = dailyTxs.length;
    const hourlyAmount = hourlyTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const dailyAmount = dailyTxs.reduce((sum, tx) => sum + tx.amount, 0);

    const thresholds = this.fraudThresholds.velocityCheck;

    const passed = 
      hourlyCount < thresholds.maxTransactionsPerHour &&
      dailyCount < thresholds.maxTransactionsPerDay &&
      hourlyAmount + amount <= thresholds.maxAmountPerHour &&
      dailyAmount + amount <= thresholds.maxAmountPerDay;

    return {
      passed,
      hourlyCount,
      dailyCount,
      hourlyAmount,
      dailyAmount,
      details: {
        hourlyTransactions: `${hourlyCount}/${thresholds.maxTransactionsPerHour}`,
        dailyTransactions: `${dailyCount}/${thresholds.maxTransactionsPerDay}`,
        hourlyAmount: `₦${hourlyAmount}/${thresholds.maxAmountPerHour}`,
        dailyAmount: `₦${dailyAmount}/${thresholds.maxAmountPerDay}`
      }
    };
  }

  /**
   * Behavioral analysis
   */
  analyzeBehavior(user, amount, type) {
    let riskScore = 0;
    const anomalies = [];

    // Check if user is new (higher risk)
    const accountAge = Date.now() - new Date(user.createdAt).getTime();
    const daysOld = accountAge / (1000 * 60 * 60 * 24);
    
    if (daysOld < 7) {
      riskScore += 15;
      anomalies.push({
        type: 'new_account',
        severity: 'medium',
        details: `Account is only ${Math.floor(daysOld)} days old`
      });
    }

    // Check KYC status
    if (!user.kyc?.verified || user.kyc?.tier < 2) {
      riskScore += 10;
      anomalies.push({
        type: 'incomplete_kyc',
        severity: 'medium',
        details: 'User has not completed full KYC verification'
      });
    }

    // Check security settings
    if (!user.security?.mfa?.enabled) {
      riskScore += 5;
    }

    return {
      riskScore,
      anomalies
    };
  }

  /**
   * Amount analysis - detect unusual amounts
   */
  async analyzeAmount(userId, amount) {
    // Get user's transaction history
    const recentTxs = await Transaction.find({
      userId,
      status: 'completed',
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    }).limit(50);

    if (recentTxs.length < 5) {
      // Not enough history, moderate risk
      return {
        riskScore: 10,
        unusual: false,
        details: 'Insufficient transaction history'
      };
    }

    // Calculate average transaction amount
    const avgAmount = recentTxs.reduce((sum, tx) => sum + tx.amount, 0) / recentTxs.length;
    const multiplier = amount / avgAmount;

    if (multiplier > this.fraudThresholds.behavioralAnalysis.unusualAmountMultiplier) {
      return {
        riskScore: 20,
        unusual: true,
        details: `Amount is ${multiplier.toFixed(1)}x higher than average (₦${avgAmount.toFixed(2)})`
      };
    }

    return {
      riskScore: 0,
      unusual: false,
      details: 'Amount is within normal range'
    };
  }

  /**
   * Time-based analysis
   */
  analyzeTransactionTime() {
    const hour = new Date().getHours();
    const { unusualTimeWindow } = this.fraudThresholds.behavioralAnalysis;

    // Transactions between 2 AM and 6 AM are unusual
    if (hour >= unusualTimeWindow && hour < 6) {
      return {
        riskScore: 10,
        unusual: true,
        details: `Transaction at unusual time: ${hour}:00`
      };
    }

    return {
      riskScore: 0,
      unusual: false,
      details: 'Transaction time is normal'
    };
  }

  /**
   * Device and location analysis
   */
  analyzeDevice(user, metadata = {}) {
    let riskScore = 0;
    const anomalies = [];

    // Check if device is trusted
    const deviceId = metadata.deviceId;
    if (deviceId) {
      const isTrusted = user.security?.trustedDevices?.some(
        device => device.deviceId === deviceId && device.trusted
      );

      if (!isTrusted) {
        riskScore += 15;
        anomalies.push({
          type: 'untrusted_device',
          severity: 'high',
          details: 'Transaction from untrusted device'
        });
      }
    }

    // Check location (simplified - in production, use proper geolocation)
    const currentLocation = metadata.location;
    if (currentLocation && user.security?.lastKnownLocation) {
      // In production, calculate actual distance
      // For now, just check if location is different
      if (currentLocation !== user.security.lastKnownLocation) {
        riskScore += 10;
        anomalies.push({
          type: 'location_change',
          severity: 'medium',
          details: 'Transaction from different location'
        });
      }
    }

    return {
      riskScore,
      anomalies
    };
  }

  /**
   * Recipient analysis
   */
  async analyzeRecipient(userId, recipientAccount) {
    // Check if recipient is in user's frequent contacts
    const recentTxs = await Transaction.find({
      userId,
      'recipient.account': recipientAccount,
      status: 'completed'
    }).limit(1);

    if (recentTxs.length === 0) {
      // New recipient - higher risk
      return {
        riskScore: 10,
        suspicious: false,
        details: 'New recipient'
      };
    }

    return {
      riskScore: 0,
      suspicious: false,
      details: 'Known recipient'
    };
  }

  /**
   * Assess overall risk level
   */
  assessRiskLevel(riskScore) {
    const thresholds = this.fraudThresholds.riskScoring;

    if (riskScore >= thresholds.criticalRisk) return 'critical';
    if (riskScore >= thresholds.highRisk) return 'high';
    if (riskScore >= thresholds.mediumRisk) return 'medium';
    return 'low';
  }

  /**
   * Basic transfer data validation
   */
  validateBasicTransferData(data) {
    const { amount, recipientAccount, recipientName } = data;

    if (!amount || amount <= 0) {
      return {
        isValid: false,
        error: 'Invalid amount'
      };
    }

    if (!recipientAccount && !recipientName) {
      return {
        isValid: false,
        error: 'Recipient account or name is required'
      };
    }

    if (recipientAccount && !/^\d{10}$/.test(recipientAccount)) {
      return {
        isValid: false,
        error: 'Invalid account number format'
      };
    }

    return { isValid: true };
  }
}

module.exports = new ValidationService();
