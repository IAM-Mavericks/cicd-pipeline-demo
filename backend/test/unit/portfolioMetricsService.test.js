const portfolioMetricsService = require('../../services/portfolioMetricsService');

describe('PortfolioMetricsService (NGX)', () => {
  it('should handle missing portfolio gracefully', () => {
    const metrics = portfolioMetricsService.computeMetrics({ portfolio: null });

    expect(metrics.totals.totalValue).toBe(0);
    expect(metrics.totals.totalInvested).toBe(0);
    expect(metrics.returns.totalReturnPct).toBe(0);
    expect(metrics.risk.riskLevel).toBe('unknown');
  });

  it('should compute totals and returns for a simple portfolio', () => {
    const portfolio = {
      holdings: [
        { symbol: 'ZENITHBANK', quantity: 10, avgCost: '30.00' }
      ]
    };

    const instrumentsBySymbol = {
      ZENITHBANK: { sector: 'Banking' }
    };

    const latestPricesBySymbol = {
      ZENITHBANK: { price: '35.00' }
    };

    const metrics = portfolioMetricsService.computeMetrics({
      portfolio,
      instrumentsBySymbol,
      latestPricesBySymbol
    });

    expect(metrics.totals.totalInvested).toBe(300);
    expect(metrics.totals.totalValue).toBe(350);
    expect(metrics.totals.totalProfitLoss).toBe(50);
    expect(metrics.returns.totalReturnPct).toBeCloseTo(16.67, 1);
    expect(metrics.allocation.bySymbol.ZENITHBANK.weight).toBeCloseTo(1, 3);
  });

  it('should compute diversification and risk proxies', () => {
    const portfolio = {
      holdings: [
        { symbol: 'ZENITHBANK', quantity: 50, avgCost: '30.00' },
        { symbol: 'GTCO', quantity: 50, avgCost: '30.00' }
      ]
    };

    const instrumentsBySymbol = {
      ZENITHBANK: { sector: 'Banking' },
      GTCO: { sector: 'Banking' }
    };

    const latestPricesBySymbol = {
      ZENITHBANK: { price: '32.00' },
      GTCO: { price: '31.00' }
    };

    const metrics = portfolioMetricsService.computeMetrics({
      portfolio,
      instrumentsBySymbol,
      latestPricesBySymbol
    });

    const symbols = metrics.allocation.bySymbol;
    expect(Object.keys(symbols).length).toBe(2);
    const totalWeight = Object.values(symbols).reduce((sum, s) => sum + s.weight, 0);
    expect(totalWeight).toBeCloseTo(1, 3);

    expect(metrics.risk.topHoldingWeight).toBeGreaterThan(0);
    expect(metrics.risk.herfindahlSymbol).toBeGreaterThan(0);
  });
});
