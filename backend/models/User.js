/**
 * User Model
 * Complete user schema with KYC, security, and compliance fields
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    select: false // Don't return password by default
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: false // Optional for ZKP-verified users
  },

  // KYC Information
  kyc: {
    tier: {
      type: Number,
      enum: [0, 1, 2, 3],
      default: 0 // Default to unverified
    },
    bvn: {
      type: String,
      select: false // Sensitive data
    },
    bvnVerified: {
      type: Boolean,
      default: false
    },
    bvnVerifiedAt: Date,
    ninVerified: {
      type: Boolean,
      default: false
    },
    ninVerifiedAt: Date,
    ageVerified: {
      type: Boolean,
      default: false
    },
    zkpProofId: String,
    zkpVerifiedAt: Date,
    nin: {
      type: String,
      select: false
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: { type: String, default: 'Nigeria' },
      postalCode: String
    },
    addressVerified: {
      type: Boolean,
      default: false
    },
    utilityBill: {
      url: String,
      uploadedAt: Date,
      verified: {
        type: Boolean,
        default: false
      }
    },
    idDocument: {
      type: { type: String, enum: ['passport', 'drivers_license', 'national_id'] },
      number: String,
      url: String,
      verified: {
        type: Boolean,
        default: false
      }
    },
    kycCompletedAt: Date
  },

  // Accounts
  accounts: [{
    accountNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    accountName: String,
    currency: {
      type: String,
      enum: ['NGN', 'USD', 'GBP', 'EUR'],
      default: 'NGN'
    },
    balance: {
      type: String, // Use string for decimal precision
      default: '0.00'
    },
    type: {
      type: String,
      enum: ['savings', 'current'],
      default: 'savings'
    },
    status: {
      type: String,
      enum: ['active', 'frozen', 'closed'],
      default: 'active'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Security
  security: {
    // Transaction PIN
    transactionPin: {
      type: String,
      select: false // Don't return PIN by default
    },

    // Pending OTP
    pendingOtp: {
      code: String,
      expires: Date,
      method: String
    },

    // MFA Settings
    mfa: {
      enabled: {
        type: Boolean,
        default: false
      },
      methods: [{
        type: String,
        enum: ['sms', 'email', 'totp']
      }],
      totpSecret: {
        type: String,
        select: false
      },
      backupCodes: [{
        code: String,
        used: Boolean,
        usedAt: Date
      }]
    },

    // Trusted Devices
    trustedDevices: [{
      fingerprint: String,
      name: String,
      type: String,
      os: String,
      browser: String,
      trustedAt: Date,
      lastUsed: Date
    }],

    // Security History
    loginHistory: [{
      timestamp: Date,
      ipAddress: String,
      location: {
        country: String,
        city: String,
        coordinates: {
          latitude: Number,
          longitude: Number
        }
      },
      deviceFingerprint: String,
      success: Boolean,
      failureReason: String
    }],

    // Failed Login Attempts
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockedUntil: Date,

    // Password Reset
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastPasswordChange: Date
  },

  // Compliance & Risk
  compliance: {
    amlStatus: {
      type: String,
      enum: ['clear', 'review', 'flagged', 'blocked'],
      default: 'clear'
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    watchlist: {
      type: Boolean,
      default: false
    },
    pep: { // Politically Exposed Person
      type: Boolean,
      default: false
    },
    sanctions: {
      type: Boolean,
      default: false
    },
    lastRiskAssessment: Date
  },

  // Preferences
  preferences: {
    language: {
      type: String,
      enum: ['en', 'pidgin', 'yo', 'ig', 'ha'], // English, Pidgin, Yoruba, Igbo, Hausa
      default: 'en'
    },
    currency: {
      type: String,
      default: 'NGN'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      transactionAlerts: { type: Boolean, default: true }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto', 'system'],
      default: 'auto'
    }
  },

  // Role & Status
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'closed'],
    default: 'active'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },

  // Metadata
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: Date
}, {
  timestamps: true
});

// Indexes for performance (removed redundant ones created by unique: true)
userSchema.index({ 'kyc.bvn': 1 }, { sparse: true });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Hash transaction PIN before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('security.transactionPin')) return next();

  try {
    const salt = await bcrypt.genSalt(10); // Lower salt for 4-digit PIN
    this.security.transactionPin = await bcrypt.hash(this.security.transactionPin, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Compare transaction PIN method
userSchema.methods.comparePin = async function (candidatePin) {
  if (!this.security.transactionPin) {
    return false;
  }
  return await bcrypt.compare(candidatePin, this.security.transactionPin);
};

// Generate account number
userSchema.methods.generateAccountNumber = function (currency = 'NGN') {
  // Nigerian account numbers are 10 digits
  const prefix = currency === 'NGN' ? '20' : '30'; // Different prefix for foreign currency
  const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return prefix + random;
};

// Get full name
userSchema.methods.getFullName = function () {
  return `${this.firstName} ${this.lastName}`;
};

// Check if user can perform transaction per CBN regulatory limits
userSchema.methods.canTransact = function (amount) {
  const tier = this.kyc?.tier || 0;

  if (tier === 0) {
    return false; // Tier 0 (Unverified) cannot perform transactions per Dec 2023 mandate
  }

  const limits = {
    1: { daily: 50000, cumulative: 300000 },
    2: { daily: 200000, cumulative: 500000 },
    3: { daily: 5000000, cumulative: null }
  };

  const limit = limits[tier];
  if (!limit) return false;

  // Amount check
  if (amount > limit.daily) return false;

  // In production, check actual daily total and cumulative balance from ledger
  return true;
};

module.exports = mongoose.model('User', userSchema);
