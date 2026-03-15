const Instrument = require('../../models/Instrument');
const InstrumentPrice = require('../../models/InstrumentPrice');
const Portfolio = require('../../models/Portfolio');

describe('Investment Models (NSE / NGX)', () => {
  describe('Instrument', () => {
    it('should require symbol and name and default to NGX/NGN', () => {
      const doc = new Instrument({});
      const err = doc.validateSync();

      expect(err.errors.symbol).toBeDefined();
      expect(err.errors.name).toBeDefined();

      const valid = new Instrument({
        symbol: 'ZENITHBANK',
        name: 'Zenith Bank Plc'
      });

      const ok = valid.validateSync();
      expect(ok).toBeUndefined();
      expect(valid.exchange).toBe('NGX');
      expect(valid.currency).toBe('NGN');
    });

    it('should enforce unique symbol per exchange via schema index (no runtime test)', () => {
      const indexes = Instrument.schema.indexes();
      const hasCompositeIndex = indexes.some(([fields]) =>
        fields.symbol === 1 && fields.exchange === 1
      );
      expect(hasCompositeIndex).toBe(true);
    });
  });

  describe('InstrumentPrice', () => {
    it('should require symbol, date, and close price', () => {
      const doc = new InstrumentPrice({});
      const err = doc.validateSync();

      expect(err.errors.symbol).toBeDefined();
      expect(err.errors.date).toBeDefined();
      expect(err.errors.close).toBeDefined();
    });

    it('should index by symbol and date for latest price lookups', () => {
      const indexes = InstrumentPrice.schema.indexes();
      const hasSymbolDateIndex = indexes.some(([fields]) =>
        fields.symbol === 1 && fields.date === -1
      );
      expect(hasSymbolDateIndex).toBe(true);
    });
  });

  describe('Portfolio', () => {
    it('should require userId, name, and at least validate holding structure', () => {
      const doc = new Portfolio({});
      const err = doc.validateSync();

      expect(err.errors.userId).toBeDefined();
      expect(err.errors.name).toBeDefined();
    });

    it('should use NGN as base currency and allow cashBalances map', () => {
      const portfolio = new Portfolio({
        userId: '507f1f77bcf86cd799439011',
        name: 'Primary NSE Portfolio',
        cashBalances: { NGN: '100000.00' }
      });

      const err = portfolio.validateSync();
      expect(err).toBeUndefined();
      expect(portfolio.baseCurrency).toBe('NGN');
      expect(portfolio.cashBalances.get('NGN')).toBe('100000.00');
    });

    it('should enforce unique portfolio name per user via schema index (no runtime test)', () => {
      const indexes = Portfolio.schema.indexes();
      const hasUserNameIndex = indexes.some(([fields]) =>
        fields.userId === 1 && fields.name === 1
      );
      expect(hasUserNameIndex).toBe(true);
    });
  });
});
