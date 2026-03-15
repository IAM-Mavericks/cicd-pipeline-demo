const Decimal = require('decimal.js');

/**
 * Portfolio Metrics Service (NGX)
 *
 * Computes returns, allocation, and simple risk/diversification metrics
 * for NSE-only portfolios using latest prices and instrument metadata.
 */
class PortfolioMetricsService {
  constructor() {
    Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });
  }

  /**
   * Compute metrics for a portfolio.
   *
   * @param {Object} params
   * @param {Object} params.portfolio - Portfolio document/object
   * @param {Object<string, Object>} params.instrumentsBySymbol - Instrument metadata keyed by symbol
   * @param {Object<string, Object>} params.latestPricesBySymbol - Latest price info keyed by symbol
   * @returns {Object} metrics
   */
  computeMetrics({ portfolio, instrumentsBySymbol = {}, latestPricesBySymbol = {} }) {
    if (!portfolio) {
      return {
        totals: {
          totalValue: 0,
          totalInvested: 0,
          totalProfitLoss: 0
        },
        returns: {
          totalReturnPct: 0,
          totalReturnAmount: 0
        },
        allocation: {
          bySymbol: {},
          bySector: {}
        },
        risk: {
          riskLevel: 'unknown',
          topHoldingWeight: 0,
          topSectorWeight: 0,
          herfindahlSymbol: 0,
          herfindahlSector: 0
        }
      };
    }

    const holdings = Array.isArray(portfolio.holdings) ? portfolio.holdings : [];

    let totalValue = new Decimal(0);
    let totalInvested = new Decimal(0);

    const perSymbol = new Map();
    const perSector = new Map();

    holdings.forEach((h) => {
      const symbol = (h.symbol || '').toUpperCase();
      if (!symbol) return;

      const qty = new Decimal(h.quantity || 0);
      if (qty.lte(0)) return;

      const avgCost = new Decimal(h.avgCost || '0');
      const invested = qty.times(avgCost);
      totalInvested = totalInvested.plus(invested);

      const priceInfo = latestPricesBySymbol[symbol] || {};
      const price = priceInfo.price != null ? new Decimal(String(priceInfo.price)) : avgCost;
      const value = qty.times(price);
      totalValue = totalValue.plus(value);

      const instrument = instrumentsBySymbol[symbol] || {};
      const sector = instrument.sector || 'Unknown';

      const prevSymbol = perSymbol.get(symbol) || { value: new Decimal(0) };
      prevSymbol.value = prevSymbol.value.plus(value);
      perSymbol.set(symbol, prevSymbol);

      const prevSector = perSector.get(sector) || { value: new Decimal(0) };
      prevSector.value = prevSector.value.plus(value);
      perSector.set(sector, prevSector);
    });

    const totals = {
      totalValue: Number(totalValue.toFixed(2)),
      totalInvested: Number(totalInvested.toFixed(2)),
      totalProfitLoss: Number(totalValue.minus(totalInvested).toFixed(2))
    };

    let totalReturnPct = 0;
    if (totalInvested.gt(0)) {
      totalReturnPct = Number(
        totalValue
          .minus(totalInvested)
          .dividedBy(totalInvested)
          .times(100)
          .toFixed(2)
      );
    }

    const returns = {
      totalReturnPct,
      totalReturnAmount: totals.totalProfitLoss
    };

    const allocation = {
      bySymbol: {},
      bySector: {}
    };

    if (totalValue.gt(0)) {
      perSymbol.forEach((entry, symbol) => {
        const weight = entry.value.dividedBy(totalValue);
        allocation.bySymbol[symbol] = {
          weight: Number(weight.toFixed(4)),
          value: Number(entry.value.toFixed(2))
        };
      });

      perSector.forEach((entry, sector) => {
        const weight = entry.value.dividedBy(totalValue);
        allocation.bySector[sector] = {
          weight: Number(weight.toFixed(4)),
          value: Number(entry.value.toFixed(2))
        };
      });
    }

    // Risk proxies
    let topHoldingWeight = 0;
    let herfindahlSymbol = 0;

    Object.values(allocation.bySymbol).forEach((entry) => {
      const w = entry.weight;
      if (w > topHoldingWeight) topHoldingWeight = w;
      herfindahlSymbol += w * w;
    });

    let topSectorWeight = 0;
    let herfindahlSector = 0;

    Object.values(allocation.bySector).forEach((entry) => {
      const w = entry.weight;
      if (w > topSectorWeight) topSectorWeight = w;
      herfindahlSector += w * w;
    });

    let riskLevel = 'low';
    if (topHoldingWeight > 0.4 || topSectorWeight > 0.5) {
      riskLevel = 'high';
    } else if (topHoldingWeight > 0.25 || topSectorWeight > 0.35) {
      riskLevel = 'medium';
    }

    if (totalValue.lte(0) || holdings.length === 0) {
      riskLevel = 'unknown';
    }

    const risk = {
      riskLevel,
      topHoldingWeight: Number(topHoldingWeight.toFixed(4)),
      topSectorWeight: Number(topSectorWeight.toFixed(4)),
      herfindahlSymbol: Number(herfindahlSymbol.toFixed(4)),
      herfindahlSector: Number(herfindahlSector.toFixed(4))
    };

    return {
      totals,
      returns,
      allocation,
      risk
    };
  }
}

module.exports = new PortfolioMetricsService();
