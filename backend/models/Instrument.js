const mongoose = require('mongoose');

const instrumentSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    minlength: 1
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  isin: {
    type: String,
    trim: true
  },
  exchange: {
    type: String,
    enum: ['NGX'],
    default: 'NGX',
    index: true
  },
  board: {
    type: String,
    trim: true
  },
  sector: {
    type: String,
    trim: true
  },
  industry: {
    type: String,
    trim: true
  },
  currency: {
    type: String,
    enum: ['NGN'],
    default: 'NGN'
  },
  tickSize: {
    type: Number,
    min: 0
  },
  lotSize: {
    type: Number,
    min: 0
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'delisted'],
    default: 'active',
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

instrumentSchema.index({ symbol: 1, exchange: 1 }, { unique: true });

module.exports = mongoose.model('Instrument', instrumentSchema);
