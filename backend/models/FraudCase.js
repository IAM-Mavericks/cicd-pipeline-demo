const mongoose = require('mongoose');

const fraudCaseSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['open', 'investigating', 'closed'],
    default: 'open',
    index: true
  },
  source: {
    type: String,
    enum: ['engine', 'security_ai', 'manual'],
    default: 'manual'
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical']
  },
  flags: [
    {
      type: {
        type: String
      },
      severity: String,
      message: String,
      source: String,
      detectedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  assignedTo: {
    type: String
  },
  notes: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

fraudCaseSchema.index({ transactionId: 1, status: 1 });
fraudCaseSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('FraudCase', fraudCaseSchema);
