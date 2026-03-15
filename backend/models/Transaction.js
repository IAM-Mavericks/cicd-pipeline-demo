/**
 * Transaction Model
 * Complete transaction schema with audit trail and compliance fields
 */

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // Transaction Identification
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },

  // Transaction Type
  type: {
    type: String,
    required: true,
    enum: [
      'transfer',
      'deposit',
      'withdrawal',
      'bill_payment',
      'airtime',
      'data',
      'international_transfer',
      'card_payment',
      'refund',
      'reversal'
    ],
    index: true
  },

  // Parties Involved
  from: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    accountNumber: String,
    accountName: String,
    balanceBefore: String, // Decimal as string
    balanceAfter: String
  },
  to: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    accountNumber: String,
    accountName: String,
    balanceBefore: String,
    balanceAfter: String,
    // For external transfers
    bankCode: String,
    bankName: String
  },

  // Amount Details
  amount: {
    type: String, // Decimal as string for precision
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'NGN',
    enum: ['NGN', 'USD', 'GBP', 'EUR']
  },
  fee: {
    type: String,
    default: '0.00'
  },
  netAmount: {
    type: String // Amount - Fee
  },

  // Transaction Status
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'reversed', 'cancelled'],
    default: 'pending',
    index: true
  },

  // Description & Metadata
  description: {
    type: String,
    trim: true
  },
  reference: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Bill Payment Specific
  billPayment: {
    provider: String, // DSTV, EKEDC, MTN, etc.
    customerIdentifier: String, // Meter number, smartcard, phone
    token: String, // For electricity
    package: String, // For cable TV
    plan: String // For data
  },

  // Security & Compliance
  security: {
    deviceFingerprint: String,
    ipAddress: String,
    location: {
      country: String,
      city: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    mfaVerified: {
      type: Boolean,
      default: false
    },
    mfaMethod: String,
    riskScore: {
      type: Number,
      min: 0,
      max: 100
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    }
  },

  // Compliance Flags
  compliance: {
    amlChecked: {
      type: Boolean,
      default: false
    },
    amlStatus: {
      type: String,
      enum: ['clear', 'review', 'flagged', 'reported'],
      default: 'clear'
    },
    reportedToNFIU: {
      type: Boolean,
      default: false
    },
    reportedAt: Date,
    cbnCompliant: {
      type: Boolean,
      default: true
    },
    manualReviewRequired: {
      type: Boolean,
      default: false
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    redFlags: [{
      type: String,
      severity: String,
      message: String,
      detectedAt: Date
    }]
  },

  // Processing Steps (for audit trail)
  steps: [{
    step: String,
    timestamp: Date,
    status: String,
    details: mongoose.Schema.Types.Mixed
  }],

  // Related Transactions
  relatedTransactions: [{
    transactionId: String,
    relationship: {
      type: String,
      enum: ['reversal', 'refund', 'split', 'fee']
    }
  }],

  // External Gateway Info
  gateway: {
    provider: String, // Paystack, Flutterwave, etc.
    reference: String,
    response: mongoose.Schema.Types.Mixed
  },

  // Failure Information
  failureReason: String,
  failedAt: Date,

  // Timestamps
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  reversedAt: Date,
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
transactionSchema.index({ 'from.userId': 1, createdAt: -1 });
transactionSchema.index({ 'to.userId': 1, createdAt: -1 });
transactionSchema.index({ status: 1, type: 1 });
transactionSchema.index({ createdAt: -1, status: 1 });
transactionSchema.index({ 'compliance.amlStatus': 1 });
transactionSchema.index({ amount: 1, createdAt: -1 }); // For high-value transaction queries

// Virtual for formatted amount
transactionSchema.virtual('formattedAmount').get(function() {
  return `${this.currency} ${parseFloat(this.amount).toLocaleString()}`;
});

// Method to check if transaction is reversible
transactionSchema.methods.isReversible = function() {
  const reversibleStatuses = ['completed'];
  const reversibleTypes = ['transfer', 'bill_payment'];
  const maxReversalTime = 24 * 60 * 60 * 1000; // 24 hours

  if (!reversibleStatuses.includes(this.status)) return false;
  if (!reversibleTypes.includes(this.type)) return false;
  
  const timeSinceCompletion = Date.now() - new Date(this.completedAt).getTime();
  if (timeSinceCompletion > maxReversalTime) return false;

  return true;
};

// Method to add processing step
transactionSchema.methods.addStep = function(step, status = 'success', details = {}) {
  this.steps.push({
    step,
    timestamp: new Date(),
    status,
    details
  });
  return this.save();
};

module.exports = mongoose.model('Transaction', transactionSchema);
