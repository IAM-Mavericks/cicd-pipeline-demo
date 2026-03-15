const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  baseCurrency: {
    type: String,
    enum: ['NGN'],
    default: 'NGN'
  },
  holdings: [{
    instrument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Instrument',
      required: true
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    avgCost: {
      type: String,
      default: '0.00'
    },
    investedAmount: {
      type: String,
      default: '0.00'
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }],
  cashBalances: {
    type: Map,
    of: String,
    default: {}
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

portfolioSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Portfolio', portfolioSchema);
