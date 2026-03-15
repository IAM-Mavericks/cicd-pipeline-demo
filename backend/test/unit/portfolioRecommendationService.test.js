const portfolioRecommendationService = require('../../services/portfolioRecommendationService');

describe('PortfolioRecommendationService (NGX)', () => {
  it('should flag overvalued stock based on PE', () => {
    const mockPortfolio = {
      holdings: [
        { symbol: 'TEST', quantity: 100, avgCost: '10' },
        { symbol: 'PEER', quantity: 50, avgCost: '5' }
      ],
      cashBalances: { NGN: '0' }
    };
    const instrumentsBySymbol = {
      TEST: { symbol: 'TEST', sector: 'Banking', peRatio: 25, pbvRatio: 3 },
      PEER: { symbol: 'PEER', sector: 'Banking', peRatio: 10, pbvRatio: 1 }
    };
    const latestPricesBySymbol = {
      TEST: { price: '10' },
      PEER: { price: '5' }
    };

    const result = portfolioRecommendationService.analyzePortfolio({
      portfolio: mockPortfolio,
      instrumentsBySymbol,
      latestPricesBySymbol
    });

    const valuationSignal = result.signals.find(s => s.type === 'valuation');
    expect(valuationSignal).toBeDefined();
    expect(valuationSignal.message).toMatch(/P\/E/i);
  });
  it('should handle missing portfolio gracefully', () => {
    const result = portfolioRecommendationService.analyzePortfolio({ portfolio: null });

    expect(result.summary.score).toBe(0);
    expect(result.summary.riskLevel).toBe('unknown');
    expect(result.signals).toHaveLength(0);
  });

  it('should flag severe cash drag when cash > 50%', () => {
    const portfolio = {
      holdings: [
        {
          symbol: 'ZENITHBANK',
          quantity: 10,
          avgCost: '30.00'
        }
      ],
      cashBalances: { NGN: '1000.00' }
    };

    const instrumentsBySymbol = {
      ZENITHBANK: { sector: 'Banking' }
    };

    const latestPricesBySymbol = {
      ZENITHBANK: { price: '35.00' }
    };

    const result = portfolioRecommendationService.analyzePortfolio({
      portfolio,
      instrumentsBySymbol,
      latestPricesBySymbol
    });

    const cashSignals = result.signals.filter((s) => s.type === 'cash_drag');
    expect(cashSignals.length).toBeGreaterThan(0);
    expect(cashSignals.some((s) => s.severity === 'high')).toBe(true);
  });

  it('should flag single stock concentration when one holding > 40%', () => {
    const portfolio = {
      holdings: [
        { symbol: 'ZENITHBANK', quantity: 100, avgCost: '30.00' },
        { symbol: 'GTCO', quantity: 10, avgCost: '35.00' }
      ],
      cashBalances: { NGN: '0.00' }
    };

    const instrumentsBySymbol = {
      ZENITHBANK: { sector: 'Banking' },
      GTCO: { sector: 'Banking' }
    };

    const latestPricesBySymbol = {
      ZENITHBANK: { price: '40.00' },
      GTCO: { price: '35.00' }
    };

    const result = portfolioRecommendationService.analyzePortfolio({
      portfolio,
      instrumentsBySymbol,
      latestPricesBySymbol
    });

    const singleStockSignals = result.signals.filter((s) => s.type === 'single_stock_concentration');
    expect(singleStockSignals.length).toBeGreaterThan(0);
    expect(singleStockSignals.some((s) => s.severity === 'high')).toBe(true);
  });

  it('should produce a reasonable score and diversification message for balanced portfolio', () => {
    const portfolio = {
      holdings: [
        { symbol: 'ZENITHBANK', quantity: 50, avgCost: '30.00' },
        { symbol: 'GTCO', quantity: 50, avgCost: '30.00' }
      ],
      cashBalances: { NGN: '100.00' }
    };

    const instrumentsBySymbol = {
      ZENITHBANK: { sector: 'Banking' },
      GTCO: { sector: 'Banking' }
    };

    const latestPricesBySymbol = {
      ZENITHBANK: { price: '32.00' },
      GTCO: { price: '31.00' }
    };

    const result = portfolioRecommendationService.analyzePortfolio({
      portfolio,
      instrumentsBySymbol,
      latestPricesBySymbol
    });

    expect(result.summary.score).toBeGreaterThan(0);
    expect(result.summary.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(result.summary.keyFindings)).toBe(true);
    expect(result.summary.stats.holdingCount).toBe(2);
  });
});
