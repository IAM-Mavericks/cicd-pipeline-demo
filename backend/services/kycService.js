/**
 * KYC Service
 * Handles tiered KYC verification for financial inclusion
 * Supports Level 0-3 verification with progressive access
 */

const logger = require('../utils/logger');
const User = require('../models/User');
const crypto = require('crypto');

class KYCService {
  constructor() {
    // KYC Tiers and requirements (standardized to CBN guidelines)
    this.kycTiers = {
      tier0: {
        name: 'Basic Wallet (Unverified)',
        description: 'Phone number verification only. Restricted access per CBN.',
        required: ['phoneNumber'],
        permissions: ['balanceInquiry'],
        limits: {
          dailyTransactions: 0,
          monthlyTransactions: 0,
          maxAmount: 0 // Mandatory BVN/NIN required for any transaction
        },
        verificationMethods: ['phone']
      },
      tier1: {
        name: 'Tier 1 (BVN/NIN Linked)',
        description: 'Basic banking with mandatory identity linkage',
        required: ['phoneNumber', 'firstName', 'lastName', 'govtIdNumber', 'govtIdType'],
        permissions: ['balanceInquiry', 'transactionHistory', 'spendingSummary', 'airtimePurchase', 'localTransfer'],
        limits: {
          dailyTransactions: 5,
          monthlyTransactions: 20,
          maxAmount: 50000 // NGN 50,000
        },
        verificationMethods: ['phone', 'email', 'kyc_verification']
      },
      tier2: {
        name: 'Tier 2 (Identity Verified)',
        description: 'Full identity verification with government database check',
        required: ['phoneNumber', 'firstName', 'lastName', 'email', 'govtIdNumber', 'govtIdType'],
        permissions: ['balanceInquiry', 'transactionHistory', 'spendingSummary', 'airtimePurchase', 'billPayment', 'localTransfer'],
        limits: {
          dailyTransactions: 20,
          monthlyTransactions: 100,
          maxAmount: 500000 // NGN 500,000
        },
        verificationMethods: ['phone', 'email', 'document']
      },
      tier3: {
        name: 'Tier 3 (Full KYC)',
        description: 'Complete verification with address and biometrics',
        required: ['phoneNumber', 'firstName', 'lastName', 'email', 'govtIdNumber', 'govtIdType', 'address', 'selfie'],
        permissions: ['all'],
        limits: {
          dailyTransactions: 50,
          monthlyTransactions: 500,
          maxAmount: 5000000 // NGN 5,000,000
        },
        verificationMethods: ['phone', 'email', 'document', 'biometric', 'address']
      }
    };

    // Supported government ID types for Nigeria and other African countries
    this.supportedIdTypes = [
      'ninn', 'nin', 'voters_card', 'drivers_license', 'passport',
      'national_id', 'bv_n', 'international_passport'
    ];

    // Alternative verification methods for financial inclusion
    this.alternativeVerifications = {
      socialGraph: 'Social connections verification',
      utilityBill: 'Utility bill verification',
      communityLeader: 'Community leader endorsement',
      agentVerification: 'Agent-assisted verification'
    };
  }

  /**
   * Get user's current KYC level
   */
  async getUserKycLevel(userId) {
    try {
      const user = await User.findById(userId).select('kyc personalInfo contactInfo documents address security');

      if (!user) {
        return { level: 'none', completed: false, nextSteps: ['Create account'] };
      }

      const kycData = user.kyc || {};
      const personalInfo = user.personalInfo || {};
      const contactInfo = user.contactInfo || {};
      const documents = user.documents || [];
      const address = user.address || {};

      // Determine current tier based on completed requirements
      let currentTier = 'tier0';
      let completedRequirements = [];

      // Tier 1: BVN/NIN mandatory (Dec 2023 CBN Circular)
      const hasIdentityLinkage = documents.some(doc =>
        (doc.type === 'bvn' || doc.type === 'nin' || doc.type === 'govtIdNumber' || doc.type === 'bv_n' || doc.type === 'ninn') &&
        doc.status === 'verified'
      );

      if (contactInfo.phoneNumber && hasIdentityLinkage) {
        currentTier = 'tier1';
        completedRequirements.push('phoneNumber', 'identityLinkage');
      }

      // Tier 2: Full Identity Verification (email + names)
      if (currentTier === 'tier1' && personalInfo.firstName && personalInfo.lastName && contactInfo.email) {
        currentTier = 'tier2';
        completedRequirements.push('firstName', 'lastName', 'email');
      }

      // Tier 3: Advanced Verification (address + biometric)
      const hasAddress = address.country && address.city && address.street;
      const hasBiometric = user.security?.biometric?.enrolled;

      if (currentTier === 'tier2' && hasAddress && hasBiometric) {
        currentTier = 'tier3';
        completedRequirements.push('address', 'selfie');
      }

      const tierInfo = this.kycTiers[currentTier] || this.kycTiers.tier0;

      return {
        level: currentTier, // Kept key as 'level' for API compatibility
        tier: tierInfo.name,
        description: tierInfo.description,
        completed: currentTier === 'tier3',
        completedRequirements,
        totalRequirements: tierInfo.required.length,
        permissions: tierInfo.permissions,
        limits: tierInfo.limits,
        nextSteps: this.getNextKycSteps(user, currentTier)
      };

    } catch (error) {
      logger.error('Error getting user KYC level:', error);
      return { level: 'error', completed: false, nextSteps: ['Retry later'] };
    }
  }

  /**
   * Validate if user can perform specific action based on KYC level
   */
  async validateKycForAction(userId, action, amount = 0, currency = 'NGN') {
    try {
      const kycInfo = await this.getUserKycLevel(userId);
      const tier = kycInfo.level;

      // Define action permissions by tier
      const actionPermissions = {
        balanceInquiry: ['tier0', 'tier1', 'tier2', 'tier3'],
        transactionHistory: ['tier1', 'tier2', 'tier3'],
        spendingSummary: ['tier1', 'tier2', 'tier3'],
        airtimePurchase: ['tier1', 'tier2', 'tier3'],
        billPayment: ['tier2', 'tier3'],
        localTransfer: ['tier1', 'tier2', 'tier3'], // Only if BVN/NIN linked (Tier 1)
        internationalTransfer: ['tier3'],
        highValueTransaction: ['tier3']
      };

      const allowedTiers = actionPermissions[action] || [];
      const isAllowed = allowedTiers.includes(tier);

      // Check amount limits
      const limits = kycInfo.limits || {};
      const convertedAmount = this.convertCurrency(amount, currency, 'NGN');
      const exceedsLimit = convertedAmount > limits.maxAmount;

      if (!isAllowed) {
        return {
          valid: false,
          error: `KYC Tier ${tier} does not permit ${action}`,
          requiredTier: allowedTiers[0],
          currentTier: tier,
          upgradeRequired: true
        };
      }

      if (exceedsLimit && action.includes('transfer')) {
        return {
          valid: false,
          error: `Transaction amount exceeds KYC limit of ${limits.maxAmount} NGN`,
          currentLimit: limits.maxAmount,
          requiredTier: 'tier3',
          upgradeRequired: tier !== 'tier3'
        };
      }

      return { valid: true, tier: tier, limits };

    } catch (error) {
      logger.error('Error validating KYC for action:', error);
      return { valid: false, error: 'KYC validation failed' };
    }
  }

  /**
   * Initiate KYC verification process
   */
  async initiateKycVerification(userId, verificationType, data) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const verificationId = this.generateVerificationId();
      const timestamp = new Date();

      let verificationProcess;

      switch (verificationType) {
        case 'phone':
          verificationProcess = await this.verifyPhoneNumber(user, data.phoneNumber);
          break;

        case 'email':
          verificationProcess = await this.verifyEmail(user, data.email);
          break;

        case 'document':
          verificationProcess = await this.verifyDocument(user, data);
          break;

        case 'address':
          verificationProcess = await this.verifyAddress(user, data);
          break;

        case 'biometric':
          verificationProcess = await this.enrollBiometric(user, data);
          break;

        case 'socialGraph':
          verificationProcess = await this.verifySocialGraph(user, data);
          break;

        case 'utilityBill':
          verificationProcess = await this.verifyUtilityBill(user, data);
          break;

        default:
          throw new Error(`Unsupported verification type: ${verificationType}`);
      }

      // Store verification request
      const verificationRecord = {
        id: verificationId,
        userId,
        type: verificationType,
        status: 'pending',
        data: verificationProcess.data || data,
        requestedAt: timestamp,
        expiresAt: new Date(timestamp.getTime() + 30 * 60 * 1000), // 30 minutes
        attempts: 0,
        maxAttempts: 3,
        metadata: verificationProcess.metadata || {}
      };

      // Store in user document or separate collection
      if (!user.kyc) user.kyc = {};
      if (!user.kyc.verifications) user.kyc.verifications = [];
      user.kyc.verifications.push(verificationRecord);
      user.kyc.pendingVerification = verificationId;

      await user.save();

      logger.info(`KYC verification initiated for user ${userId}: ${verificationType}`);

      return {
        success: true,
        verificationId,
        type: verificationType,
        status: 'pending',
        nextSteps: verificationProcess.nextSteps || ['Complete verification'],
        expiresIn: 30 * 60 // seconds
      };

    } catch (error) {
      logger.error('Error initiating KYC verification:', error);
      return {
        success: false,
        error: error.message,
        verificationId: null
      };
    }
  }

  /**
   * Complete KYC verification
   */
  async completeKycVerification(userId, verificationId, verificationCode, additionalData = {}) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.kyc?.pendingVerification) {
        throw new Error('No pending verification found');
      }

      const verification = user.kyc.verifications.find(v => v.id === verificationId);
      if (!verification || verification.status !== 'pending') {
        throw new Error('Invalid or expired verification');
      }

      if (new Date() > verification.expiresAt) {
        verification.status = 'expired';
        user.kyc.pendingVerification = null;
        await user.save();
        throw new Error('Verification expired. Please start a new one.');
      }

      // Verify the code
      const isValid = await this.validateVerificationCode(
        verification.type,
        verification.data,
        verificationCode,
        additionalData
      );

      if (!isValid) {
        verification.attempts++;
        if (verification.attempts >= verification.maxAttempts) {
          verification.status = 'failed';
          user.kyc.pendingVerification = null;
        }
        await user.save();
        throw new Error('Invalid verification code');
      }

      // Mark as successful and update user KYC level
      verification.status = 'verified';
      verification.completedAt = new Date();
      verificationCode = null; // Clear code

      // Update user data based on verification type
      await this.updateUserFromVerification(user, verification.type, verification.data, additionalData);

      // Recalculate KYC level
      const newKycLevel = await this.getUserKycLevel(userId);
      user.kyc.level = newKycLevel.level;
      user.kyc.tier = newKycLevel.tier;

      user.kyc.pendingVerification = null;
      await user.save();

      logger.info(`KYC verification completed for user ${userId}: ${verification.type}`);

      return {
        success: true,
        verificationId,
        status: 'verified',
        newLevel: user.kyc.level,
        permissions: newKycLevel.permissions,
        limits: newKycLevel.limits
      };

    } catch (error) {
      logger.error('Error completing KYC verification:', error);
      return {
        success: false,
        error: error.message,
        verificationId
      };
    }
  }

  /**
   * Get next KYC steps for user
   */
  getNextKycSteps(user, currentLevel) {
    const tier = this.kycTiers[currentLevel] || this.kycTiers.level0;
    const personalInfo = user.personalInfo || {};
    const contactInfo = user.contactInfo || {};
    const documents = user.documents || [];
    const address = user.address || {};

    const missingRequirements = tier.required.filter(req => {
      switch (req) {
        case 'phoneNumber':
          return !contactInfo.phoneNumber;
        case 'firstName':
        case 'lastName':
          return !personalInfo[req];
        case 'email':
          return !contactInfo.email;
        case 'govtIdNumber':
        case 'govtIdType':
          return !documents.some(doc => doc.status === 'verified');
        case 'address':
          return !address.country;
        case 'selfie':
          return !user.security?.biometric?.enrolled;
        default:
          return true;
      }
    });

    if (missingRequirements.length === 0 && currentLevel !== 'tier3') {
      // Suggest upgrade to next tier
      const nextTier = Object.keys(this.kycTiers).find(tierKey =>
        tierKey > currentLevel && !tierKey.startsWith('tier')
      ) || 'tier3';

      return [`Upgrade to ${this.kycTiers[nextTier].name} for more features`];
    }

    return missingRequirements.map(req => {
      switch (req) {
        case 'phoneNumber':
          return 'Verify phone number';
        case 'firstName':
        case 'lastName':
          return 'Add full name';
        case 'email':
          return 'Verify email address';
        case 'govtIdNumber':
        case 'govtIdType':
          return 'Upload government ID';
        case 'address':
          return 'Add residential address';
        case 'selfie':
          return 'Complete biometric verification';
        default:
          return `Complete ${req} verification`;
      }
    });
  }

  /**
   * Generate unique verification ID
   */
  generateVerificationId() {
    return `kyc_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Convert currency for limit calculations
   */
  convertCurrency(amount, fromCurrency, toCurrency) {
    // Simplified conversion - in production use real-time rates
    const rates = {
      NGN: 1,
      USD: 1600, // Approximate
      GHS: 200,
      KES: 12,
      UGX: 0.43
    };

    const converted = (amount * (rates[fromCurrency] || 1)) / (rates[toCurrency] || 1);
    return Math.round(converted);
  }

  /**
   * Phone number verification (simplified)
   */
  async verifyPhoneNumber(user, phoneNumber) {
    // In production, integrate with SMS provider
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code temporarily (use Redis in production)
    global.tempVerifications = global.tempVerifications || {};
    global.tempVerifications[`phone_${phoneNumber}`] = {
      code,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    };

    return {
      nextSteps: ['Enter 6-digit code sent to your phone'],
      data: { phoneNumber, codeSent: true },
      metadata: { method: 'sms' }
    };
  }

  /**
   * Email verification (simplified)
   */
  async verifyEmail(user, email) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    global.tempVerifications[`email_${email}`] = {
      code,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    };

    // In production, send email
    logger.info(`Email verification code for ${email}: ${code}`);

    return {
      nextSteps: ['Enter 6-digit code sent to your email'],
      data: { email, codeSent: true },
      metadata: { method: 'email' }
    };
  }

  /**
   * Document verification (placeholder)
   */
  async verifyDocument(user, data) {
    // In production, integrate with document verification API
    const { idNumber, idType, idImage } = data;

    // Simulate verification process
    const verificationToken = `doc_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Store for manual/AI review
    if (!user.documents) user.documents = [];
    user.documents.push({
      type: idType,
      number: idNumber,
      image: idImage,
      status: 'pending',
      verificationToken,
      submittedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    await user.save();

    return {
      nextSteps: ['Document under review (usually 24-48 hours)'],
      data: { idNumber, idType, status: 'submitted' },
      metadata: { method: 'document_ai' }
    };
  }

  /**
   * Address verification (simplified)
   */
  async verifyAddress(user, data) {
    const { country, city, street, postalCode } = data;

    // Basic validation
    if (!country || !city || !street) {
      throw new Error('Complete address information required');
    }

    // In production, verify with address validation service
    return {
      nextSteps: ['Address verified successfully'],
      data: { country, city, street, postalCode, verified: true },
      metadata: { method: 'address_validation' }
    };
  }

  /**
   * Biometric enrollment (placeholder)
   */
  async enrollBiometric(user, data) {
    // In production, integrate with biometric SDK
    const { biometricType, biometricData } = data; // fingerprint, face, etc.

    if (!user.security) user.security = {};
    user.security.biometric = {
      enrolled: true,
      type: biometricType,
      enrolledAt: new Date(),
      lastUsed: new Date()
    };

    await user.save();

    return {
      nextSteps: ['Biometric enrollment completed'],
      data: { biometricType, enrolled: true },
      metadata: { method: 'biometric_sdk' }
    };
  }

  /**
   * Social graph verification (placeholder)
   */
  async verifySocialGraph(user, data) {
    // In production, integrate with social network analysis
    const { contacts, socialNetworks } = data;

    return {
      nextSteps: ['Social graph analysis in progress'],
      data: { contactsCount: contacts?.length || 0, networks: socialNetworks },
      metadata: { method: 'social_analysis' }
    };
  }

  /**
   * Utility bill verification (placeholder)
   */
  async verifyUtilityBill(user, data) {
    // In production, verify utility bill documents
    const { billNumber, provider, amount, date } = data;

    return {
      nextSteps: ['Utility bill verification in progress'],
      data: { billNumber, provider, amount, date },
      metadata: { method: 'document_ai' }
    };
  }

  /**
   * Validate verification code
   */
  async validateVerificationCode(type, data, code, additionalData) {
    // Check temporary storage
    const key = `${type}_${data[type === 'phone' ? 'phoneNumber' : 'email']}`;
    const stored = global.tempVerifications?.[key];

    if (!stored || new Date() > stored.expiresAt) {
      return false;
    }

    return stored.code === code;
  }

  /**
   * Update user data from verification
   */
  async updateUserFromVerification(user, type, data, additionalData) {
    switch (type) {
      case 'phone':
        if (!user.contactInfo) user.contactInfo = {};
        user.contactInfo.phoneNumber = data.phoneNumber;
        user.contactInfo.phoneVerified = true;
        user.contactInfo.phoneVerifiedAt = new Date();
        break;

      case 'email':
        if (!user.contactInfo) user.contactInfo = {};
        user.contactInfo.email = data.email;
        user.contactInfo.emailVerified = true;
        user.contactInfo.emailVerifiedAt = new Date();
        break;

      case 'document':
        // Update document status when verified
        const docIndex = user.documents.findIndex(d => d.verificationToken === data.verificationToken);
        if (docIndex > -1) {
          user.documents[docIndex].status = 'verified';
          user.documents[docIndex].verifiedAt = new Date();
        }
        break;

      case 'address':
        user.address = { ...user.address, ...data, verified: true, verifiedAt: new Date() };
        break;

      case 'biometric':
        // Already handled in enrollBiometric
        break;

      default:
        logger.warn(`No update logic for verification type: ${type}`);
    }
  }
}

module.exports = new KYCService();
