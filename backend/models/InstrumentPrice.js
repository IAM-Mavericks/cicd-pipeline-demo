const mongoose = require('mongoose');

const instrumentPriceSchema = new mongoose.Schema({
  instrument: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instrument',
    index: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  source: {
    type: String,
    enum: ['nse', 'vendor', 'mock'],
    default: 'nse'
  },
  open: {
    type: String,
    trim: true
  },
  high: {
    type: String,
    trim: true
  },
  low: {
    type: String,
    trim: true
  },
  close: {
    type: String,
    trim: true,
    required: true
  },
  previousClose: {
    type: String,
    trim: true
  },
  vwap: {
    type: String,
    trim: true
  },
  volume: {
    type: Number,
    min: 0
  },
  netChange: {
    type: String,
    trim: true
  },
  netChangePct: {
    type: String,
    trim: true
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

instrumentPriceSchema.index({ symbol: 1, date: -1 });
instrumentPriceSchema.index({ instrument: 1, date: -1 });

module.exports = mongoose.model('InstrumentPrice', instrumentPriceSchema);
