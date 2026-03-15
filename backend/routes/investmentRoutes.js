const express = require('express');
const Portfolio = require('../models/Portfolio');
const Instrument = require('../models/Instrument');
const nseMarketDataService = require('../services/nseMarketDataService');
const portfolioMetricsService = require('../services/portfolioMetricsService');
const portfolioRecommendationService = require('../services/portfolioRecommendationService');
const InstrumentAnalytics = require('../models/InstrumentAnalytics');
const { Decimal } = require('decimal.js');

const router = express.Router();

// GET /api/investments/portfolio/:id/metrics
// Requires authenticated user (req.user set by JWT middleware at server level)
router.get('/portfolio/:id/metrics', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { id } = req.params;
    const portfolio = await Portfolio.findById(id);

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found'
      });
    }

    if (String(portfolio.userId) !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to access this portfolio'
      });
    }

    const holdings = Array.isArray(portfolio.holdings) ? portfolio.holdings : [];
    const symbols = [...new Set(
      holdings
        .map((h) => (h.symbol || '').toUpperCase())
        .filter(Boolean)
    )];

    const instrumentsBySymbol = {};
    if (symbols.length > 0) {
      const instruments = await Instrument.find({ symbol: { $in: symbols } });
      instruments.forEach((inst) => {
        if (inst.symbol) {
          instrumentsBySymbol[inst.symbol.toUpperCase()] = inst;
        }
      });
    }

    const latestPricesBySymbol = {};
    if (symbols.length > 0) {
      const quoteResults = await Promise.all(
        symbols.map((symbol) => nseMarketDataService.getQuote(symbol))
      );

      quoteResults.forEach((result, idx) => {
        const symbol = symbols[idx];
        if (result && result.success && result.data) {
          latestPricesBySymbol[symbol] = result.data;
        }
      });
    }

    const metrics = portfolioMetricsService.computeMetrics({
      portfolio: typeof portfolio.toObject === 'function' ? portfolio.toObject() : portfolio,
      instrumentsBySymbol,
      latestPricesBySymbol
    });

    res.json({
      success: true,
      data: {
        portfolioId: portfolio._id,
        metrics
      }
    });
  } catch (error) {
    console.error('Portfolio metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to compute portfolio metrics'
    });
  }
});

// GET /api/investments/portfolio/:id/recommendations
router.get('/portfolio/:id/recommendations', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { id } = req.params;
    const portfolio = await Portfolio.findById(id);

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found'
      });
    }

    if (String(portfolio.userId) !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to access this portfolio'
      });
    }

    const holdings = Array.isArray(portfolio.holdings) ? portfolio.holdings : [];
    const symbols = [...new Set(
      holdings
        .map((h) => (h.symbol || '').toUpperCase())
        .filter(Boolean)
    )];

    const [instruments, latestPrices, analytics] = await Promise.all([
      symbols.length > 0 
        ? Instrument.find({ symbol: { $in: symbols } })
        : [],
      symbols.length > 0
        ? nseMarketDataService.getLatestPrices(symbols)
        : {},
      symbols.length > 0
        ? InstrumentAnalytics.aggregate([
            { $match: { symbol: { $in: symbols } } },
            { $sort: { asOfDate: -1 } },
            { $group: { _id: '$symbol', doc: { $first: '$$ROOT' } } }
          ])
        : []
    ]);

    const instrumentsBySymbol = {};
    instruments.forEach((inst) => {
      if (inst.symbol) {
        instrumentsBySymbol[inst.symbol.toUpperCase()] = { ...inst.toObject() };
      }
    });

    if (Array.isArray(analytics)) {
      analytics.forEach(({ _id, doc }) => {
        const symbol = (_id || '').toUpperCase();
        if (!symbol || !doc) return;
        if (!instrumentsBySymbol[symbol]) {
          instrumentsBySymbol[symbol] = {};
        }
        instrumentsBySymbol[symbol].avgDailyVolume = doc.avgDailyVolume;
        instrumentsBySymbol[symbol].bidAskSpread = doc.bidAskSpread;
        instrumentsBySymbol[symbol].freeFloatMarketCap = doc.freeFloatMarketCap;
      });
    }

    const recommendations = portfolioRecommendationService.analyzePortfolio({
      portfolio,
      instrumentsBySymbol,
      latestPricesBySymbol: latestPrices
    });

    res.json({
      success: true,
      data: {
        portfolioId: id,
        ...recommendations
      }
    });
  } catch (error) {
    console.error('Error generating portfolio recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate portfolio recommendations',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/investments/portfolio/:id/insights
// Combines metrics, recommendations, and performance data
router.get('/portfolio/:id/insights', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { id } = req.params;
    const portfolio = await Portfolio.findById(id);

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'Portfolio not found'
      });
    }

    if (String(portfolio.userId) !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to access this portfolio'
      });
    }

    const holdings = Array.isArray(portfolio.holdings) ? portfolio.holdings : [];
    const symbols = [...new Set(
      holdings
        .map((h) => (h.symbol || '').toUpperCase())
        .filter(Boolean)
    )];

    // Get instrument metadata
    const instrumentsBySymbol = {};
    if (symbols.length > 0) {
      const instruments = await Instrument.find({ symbol: { $in: symbols } });
      instruments.forEach((inst) => {
        if (inst.symbol) {
          instrumentsBySymbol[inst.symbol.toUpperCase()] = inst;
        }
      });
    }

    // Get latest prices
    const latestPricesBySymbol = {};
    if (symbols.length > 0) {
      const quoteResults = await Promise.all(
        symbols.map((symbol) => nseMarketDataService.getQuote(symbol))
      );

      quoteResults.forEach((result, idx) => {
        const symbol = symbols[idx];
        if (result && result.success && result.data) {
          latestPricesBySymbol[symbol] = result.data;
        }
      });
    }

    // Get instrument analytics
    let analyticsBySymbol = {};
    if (symbols.length > 0) {
      let analyticsResult = await InstrumentAnalytics.find({ symbol: { $in: symbols } });
      if (Array.isArray(analyticsResult)) {
        analyticsResult = analyticsResult.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      } else if (analyticsResult && typeof analyticsResult.sort === 'function') {
        analyticsResult = await analyticsResult.sort({ timestamp: -1 });
      } else {
        analyticsResult = [];
      }

      analyticsResult.forEach(a => {
        const sym = (a.symbol || '').toUpperCase();
        if (sym && !analyticsBySymbol[sym]) {
          analyticsBySymbol[sym] = a;
        }
      });
    }

    // Compute metrics
    const metrics = portfolioMetricsService.computeMetrics({
      portfolio: typeof portfolio.toObject === 'function' ? portfolio.toObject() : portfolio,
      instrumentsBySymbol,
      latestPricesBySymbol
    });

    // Get recommendations
    const { summary: recSummary, signals, performance } = portfolioRecommendationService.analyzePortfolio({
      portfolio: typeof portfolio.toObject === 'function' ? portfolio.toObject() : portfolio,
      instrumentsBySymbol,
      latestPricesBySymbol,
      analyticsBySymbol
    });

    // Calculate cash percentage
    const cashBalance = new Decimal(portfolio.cashBalances?.NGN || '0');
    const totalValue = new Decimal(metrics.totals.totalValue).plus(cashBalance);
    const cashPercentage = totalValue.gt(0) 
      ? cashBalance.dividedBy(totalValue).times(100).toNumber() 
      : 0;

    // Build response
    const response = {
      summary: {
        totalValue: Number(totalValue.toFixed(2)),
        totalReturn: metrics.returns.totalReturnAmount,
        totalReturnPct: metrics.returns.totalReturnPct,
        riskScore: calculateRiskScore(metrics.risk),
        riskLevel: metrics.risk.riskLevel,
        diversificationScore: calculateDiversificationScore(metrics.allocation, metrics.risk),
        lastUpdated: new Date().toISOString()
      },
      metrics: {
        returns: formatReturns(metrics, latestPricesBySymbol, portfolio.holdings),
        risk: formatRiskMetrics(metrics.risk, analyticsBySymbol),
        diversification: formatDiversification(metrics.allocation, instrumentsBySymbol)
      },
      signals: signals.map(signal => ({
        id: signal.id,
        title: signal.title,
        severity: signal.severity,
        category: signal.category || 'general',
        message: signal.message,
        suggestions: signal.suggestions || [],
        data: signal.data || {}
      })),
      performance: formatPerformance(performance, metrics, portfolio.holdings, instrumentsBySymbol, latestPricesBySymbol),
      tax: calculateTaxImplications(portfolio.holdings, latestPricesBySymbol, instrumentsBySymbol)
    };

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Portfolio insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate portfolio insights'
    });
  }
});

// Helper methods for response formatting
function calculateRiskScore(riskMetrics) {
  // Simple risk score calculation (0-100)
  let score = 50; // Base score
  
  // Adjust based on concentration
  if (riskMetrics.topHoldingWeight > 0.5) score += 30;
  else if (riskMetrics.topHoldingWeight > 0.3) score += 15;
  
  if (riskMetrics.topSectorWeight > 0.6) score += 30;
  else if (riskMetrics.topSectorWeight > 0.4) score += 15;
  
  // Cap between 0-100
  return Math.min(100, Math.max(0, Math.round(score)));
}

function calculateDiversificationScore(allocation, riskMetrics) {
  // Higher is better (0-100)
  const symbolHHI = riskMetrics.herfindahlSymbol;
  const sectorHHI = riskMetrics.herfindahlSector;
  
  // Convert HHI to a 0-100 score (lower HHI is better)
  const symbolScore = Math.max(0, 100 - (symbolHHI * 100));
  const sectorScore = Math.max(0, 100 - (sectorHHI * 100));
  
  // Weighted average (slightly more weight to sector diversity)
  return Math.round((symbolScore * 0.4) + (sectorScore * 0.6));
}

function formatReturns(metrics, latestPrices, holdings) {
  // This would be enhanced with historical data in a real implementation
  return {
    '1d': metrics.returns.totalReturnPct * 0.9, // Placeholder
    '1w': metrics.returns.totalReturnPct * 0.85, // Placeholder
    '1m': metrics.returns.totalReturnPct * 0.8, // Placeholder
    ytd: metrics.returns.totalReturnPct * 0.7, // Placeholder
    '1y': metrics.returns.totalReturnPct // Placeholder
  };
}

function formatRiskMetrics(riskMetrics, analyticsBySymbol) {
  // Calculate average volatility from analytics
  let totalVol = 0;
  let count = 0;
  
  Object.values(analyticsBySymbol).forEach(analytics => {
    if (analytics.volatility30d) {
      totalVol += analytics.volatility30d;
      count++;
    }
  });
  
  const avgVolatility = count > 0 ? totalVol / count : 0;
  
  return {
    volatility: Number(avgVolatility.toFixed(2)),
    maxDrawdown: riskMetrics.maxDrawdown || -5.2, // Placeholder
    sharpeRatio: 1.2, // Placeholder
    beta: 0.98 // Placeholder
  };
}

function formatDiversification(allocation, instrumentsBySymbol) {
  const sectors = Object.entries(allocation.bySector).map(([sector, data]) => ({
    name: sector,
    weight: data.weight * 100,
    benchmark: 0 // Would come from benchmarks in a real implementation
  }));
  
  // Get top 5 holdings by weight
  const holdings = Object.entries(allocation.bySymbol)
    .map(([symbol, data]) => ({
      symbol,
      weight: data.weight * 100,
      name: instrumentsBySymbol[symbol]?.name || symbol
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);
  
  return { sectors, topHoldings: holdings };
}

function formatPerformance(performance, metrics, holdings, instrumentsBySymbol, latestPrices) {
  // This would be enhanced with actual performance attribution in a real implementation
  const topContributors = Object.entries(metrics.allocation.bySymbol)
    .map(([symbol, data]) => {
      const holding = holdings.find(h => h.symbol === symbol);
      const priceInfo = latestPrices[symbol] || {};
      const avgPrice = holding ? parseFloat(holding.avgCost) : 0;
      const currentPrice = priceInfo.price || 0;
      const returnPct = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
      
      return {
        symbol,
        name: instrumentsBySymbol[symbol]?.name || symbol,
        contribution: (data.weight * returnPct).toFixed(2),
        returnPct: returnPct.toFixed(2)
      };
    })
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3);
  
  const sectorContributions = Object.entries(metrics.allocation.bySector).map(([sector, data]) => ({
    sector,
    contribution: (data.weight * 10).toFixed(2), // Placeholder
    returnPct: (Math.random() * 20).toFixed(2) // Placeholder
  }));
  
  return {
    attribution: {
      topContributors,
      sectorContributions
    },
    volatility: {
      monthly: 12.4, // Placeholder
      benchmark: 10.8, // Placeholder
      correlation: 0.92 // Placeholder
    }
  };
}

function calculateTaxImplications(holdings, latestPrices, instrumentsBySymbol) {
  // This would be enhanced with actual tax calculations in a real implementation
  let totalGain = 0;
  let totalLoss = 0;
  
  holdings.forEach(holding => {
    const priceInfo = latestPrices[holding.symbol] || {};
    const currentPrice = priceInfo.price || 0;
    const avgPrice = parseFloat(holding.avgCost) || 0;
    const gain = (currentPrice - avgPrice) * (parseFloat(holding.quantity) || 0);
    
    if (gain > 0) {
      totalGain += gain;
    } else {
      totalLoss += Math.abs(gain);
    }
  });
  
  const netGain = Math.max(0, totalGain - totalLoss);
  const taxRate = 0.1; // 10% capital gains tax (simplified)
  const estimatedTax = netGain * taxRate;
  
  return {
    estimatedTaxLiability: Number(estimatedTax.toFixed(2)),
    taxEfficient: netGain < 100000, // Placeholder logic
    suggestions: netGain > 0 ? [
      'Consider tax-loss harvesting on underperforming positions',
      'Review holding periods to optimize capital gains tax'
    ] : []
  };
}

module.exports = router;
