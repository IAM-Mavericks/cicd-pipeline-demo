const Decimal = require('decimal.js');

/**
 * Portfolio Recommendation Service (NGX / NSE only)
 *
 * Pure rule-based engine that analyzes a portfolio and returns insights.
 * This is a skeleton with clear hooks where AI/ML recommendations
 * can be plugged in later.
 */
class PortfolioRecommendationService {
  constructor() {
    Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

    this.severity = {
      INFO: 'info',
      WARNING: 'warning',
      HIGH: 'high'
    };

    // Sector performance benchmarks (NGX sectors)
    this.sectorBenchmarks = {
      'Banking': { weight: 0.3, performance: 0.12 },
      'Consumer Goods': { weight: 0.2, performance: 0.08 },
      'Oil & Gas': { weight: 0.15, performance: 0.15 },
      'Industrial Goods': { weight: 0.1, performance: 0.05 },
      'Healthcare': { weight: 0.05, performance: 0.1 },
      'ICT': { weight: 0.1, performance: 0.18 },
      'Agriculture': { weight: 0.05, performance: 0.07 },
      'Others': { weight: 0.05, performance: 0.05 }
    };

    // Minimum liquidity threshold (NGN)
    this.minLiquidityThreshold = 100000; // NGN 100,000
  }

  /**
   * Analyze a portfolio and produce insights.
   *
   * @param {Object} params
   * @param {Object} params.portfolio - Portfolio document/object
   * @param {Object<string, Object>} params.instrumentsBySymbol - Instrument metadata keyed by symbol
   * @param {Object<string, Object>} params.latestPricesBySymbol - Latest price info keyed by symbol
   * @returns {{ summary: Object, signals: Array, ai: Object|null }}
   */
  analyzePortfolio({ portfolio, instrumentsBySymbol = {}, latestPricesBySymbol = {} }) {
    if (!portfolio) {
      return {
        summary: {
          score: 0,
          riskLevel: 'unknown',
          keyFindings: ['No portfolio data provided']
        },
        signals: [],
        ai: null
      };
    }

    const holdings = Array.isArray(portfolio.holdings) ? portfolio.holdings : [];
    const cashBalances = portfolio.cashBalances || new Map();

    const context = this.buildContext(holdings, instrumentsBySymbol, latestPricesBySymbol, cashBalances);

    const signals = [];
    signals.push(...this.checkCashDrag(context));
    signals.push(...this.checkSingleStockConcentration(context));
    signals.push(...this.checkSectorConcentration(context));
    signals.push(...this.checkLiquidity(context));
    signals.push(...this.analyzeSectorAllocation(context));
    signals.push(...this.checkValuation(context));
    signals.push(...this.checkMomentum(context));
    signals.push(...this.identifyTaxOpportunities(context));
    
    const performance = this.analyzePerformance(context);
    const summary = this.buildSummary(context, signals, performance);

    return {
      summary,
      signals,
      performance,
      ai: {
        enabled: false,
        notes: 'AI/ML recommendations can be plugged in here (e.g. via securityAIService or external models).',
        lastUpdated: new Date().toISOString()
      }
    };
  }

  buildContext(holdings, instrumentsBySymbol, latestPricesBySymbol, cashBalances) {
    let totalMarketValue = new Decimal(0);
    let totalInvested = new Decimal(0);
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    const enrichedHoldings = holdings.map((h) => {
      const symbol = (h.symbol || '').toUpperCase();
      const qty = new Decimal(h.quantity || 0);
      const avgCost = new Decimal(h.avgCost || '0');
      const invested = qty.times(avgCost);
      totalInvested = totalInvested.plus(invested);

      const priceInfo = latestPricesBySymbol[symbol] || {};
      const price = priceInfo.price != null ? new Decimal(String(priceInfo.price)) : avgCost;
      const marketValue = qty.times(price);
      totalMarketValue = totalMarketValue.plus(marketValue);

      const instrument = instrumentsBySymbol[symbol] || {};
      const purchaseDate = h.purchaseDate ? new Date(h.purchaseDate) : oneYearAgo;
      const daysHeld = Math.max(1, Math.floor((now - purchaseDate) / (1000 * 60 * 60 * 24)));
      
      // Calculate return and annualized return
      const totalReturn = marketValue.minus(invested);
      const returnPct = invested.gt(0) ? totalReturn.dividedBy(invested).times(100) : new Decimal(0);
      const annualizedReturn = daysHeld >= 1 ? 
        returnPct.times(365).dividedBy(daysHeld) : new Decimal(0);

      return {
        symbol,
        quantity: qty,
        avgCost,
        invested,
        price,
        marketValue,
        sector: instrument.sector || 'Unknown',
        instrument,
        purchaseDate: h.purchaseDate,
        daysHeld,
        totalReturn,
        returnPct: returnPct.toNumber(),
        annualizedReturn: annualizedReturn.toNumber(),
        // Volatility metrics (would be populated from historical data)
        volatility: 0, // Placeholder for standard deviation of returns
        beta: 1.0, // Market beta (1.0 = market average)
        // Liquidity metrics (would come from market data)
        avgDailyVolume: instrument.avgDailyVolume || 0,
        bidAskSpread: instrument.bidAskSpread || 0.01 // Default 1% spread
      };
    });

    // Calculate sector allocations
    const sectorAllocation = {};
    enrichedHoldings.forEach(h => {
      const sector = h.sector || 'Unknown';
      if (!sectorAllocation[sector]) {
        sectorAllocation[sector] = {
          value: new Decimal(0),
          weight: new Decimal(0),
          count: 0,
          performance: this.sectorBenchmarks[sector]?.performance || 0.1
        };
      }
      sectorAllocation[sector].value = sectorAllocation[sector].value.plus(h.marketValue);
      sectorAllocation[sector].count += 1;
    });

    // Calculate weights
    Object.values(sectorAllocation).forEach(sector => {
      sector.weight = sector.value.dividedBy(totalMarketValue.gt(0) ? totalMarketValue : 1);
    });

    // NGN cash balance only (NSE focus)
    let cashNg = new Decimal(0);
    if (cashBalances instanceof Map) {
      const raw = cashBalances.get('NGN');
      if (raw != null) cashNg = new Decimal(String(raw));
    } else if (cashBalances && typeof cashBalances === 'object') {
      if (cashBalances.NGN != null) cashNg = new Decimal(String(cashBalances.NGN));
    }

    // Calculate cash weight
    const totalValue = totalMarketValue.plus(cashNg);
    const cashWeight = cashNg.dividedBy(totalValue.gt(0) ? totalValue : 1);

    return {
      holdings: enrichedHoldings,
      totalMarketValue,
      totalInvested,
      cashNg,
      cashWeight,
      totalValue,
      sectorAllocation,
      asOfDate: now.toISOString()
    };
  }

  checkCashDrag(context) {
    const { totalValue, cashNg } = context;
    if (totalValue.lte(0)) {
      return [];
    }

    const weight = cashNg.dividedBy(totalValue);
    const signals = [];

    if (weight.greaterThan(0.5)) {
      signals.push({
        id: 'cash_drag_severe',
        type: 'cash_drag',
        severity: this.severity.HIGH,
        message: 'More than 50% of portfolio is in cash (NGN). Consider deploying some cash into NGX assets.',
        details: { cashWeight: weight.toNumber() }
      });
    } else if (weight.greaterThan(0.3)) {
      signals.push({
        id: 'cash_drag_moderate',
        type: 'cash_drag',
        severity: this.severity.WARNING,
        message: 'Cash allocation is between 30% and 50%. This may slow long-term returns.',
        details: { cashWeight: weight.toNumber() }
      });
    }

    return signals;
  }

  checkSingleStockConcentration(context) {
    const { holdings, totalMarketValue } = context;
    if (totalMarketValue.lte(0) || holdings.length === 0) {
      return [];
    }

    const signals = [];

    holdings.forEach((h) => {
      if (h.marketValue.lte(0)) return;
      const weight = h.marketValue.dividedBy(totalMarketValue);

      if (weight.greaterThan(0.4)) {
        signals.push({
          id: `single_stock_concentration_high_${h.symbol}`,
          type: 'single_stock_concentration',
          severity: this.severity.HIGH,
          message: `${h.symbol} is more than 40% of your NGX portfolio. Consider diversifying.`,
          details: { symbol: h.symbol, weight: weight.toNumber() }
        });
      } else if (weight.greaterThan(0.25)) {
        signals.push({
          id: `single_stock_concentration_warn_${h.symbol}`,
          type: 'single_stock_concentration',
          severity: this.severity.WARNING,
          message: `${h.symbol} is between 25% and 40% of your portfolio. Monitor concentration risk.`,
          details: { symbol: h.symbol, weight: weight.toNumber() }
        });
      }
    });

    return signals;
  }

  checkSectorConcentration(context) {
    const { holdings, totalMarketValue } = context;
    if (totalMarketValue.lte(0) || holdings.length === 0) {
      return [];
    }

    const bySector = new Map();

    holdings.forEach((h) => {
      const sector = h.sector || 'Unknown';
      const prev = bySector.get(sector) || new Decimal(0);
      bySector.set(sector, prev.plus(h.marketValue));
    });

    const signals = [];

    for (const [sector, value] of bySector.entries()) {
      if (value.lte(0)) continue;
      const weight = value.dividedBy(totalMarketValue);

      if (weight.greaterThan(0.5)) {
        signals.push({
          id: `sector_concentration_high_${sector}`,
          type: 'sector_concentration',
          severity: this.severity.HIGH,
          message: `More than 50% of your NGX portfolio is in the ${sector} sector.`,
          details: { sector, weight: weight.toNumber() }
        });
      } else if (weight.greaterThan(0.35)) {
        signals.push({
          id: `sector_concentration_warn_${sector}`,
          type: 'sector_concentration',
          severity: this.severity.WARNING,
          message: `Between 35% and 50% of your NGX portfolio is in the ${sector} sector.`,
          details: { sector, weight: weight.toNumber() }
        });
      }
    }

    return signals;
  }

  // New method to analyze sector allocation vs. benchmarks
  // New method to check valuation vs sector median
  // Momentum / volatility rules
  checkMomentum(context) {
    const { holdings } = context;
    const signals = [];

    holdings.forEach((h) => {
      const { rsi14, volatility30d } = h.instrument;
      if (rsi14 != null) {
        if (rsi14 > 70) {
          signals.push({
            id: `overbought_${h.symbol}`,
            type: 'momentum',
            severity: this.severity.INFO,
            message: `${h.symbol} shows over-bought signals (RSI ${rsi14.toFixed(1)} > 70).`,
            suggestedAction: 'Consider waiting for pull-back before adding.'
          });
        } else if (rsi14 < 30) {
          signals.push({
            id: `oversold_${h.symbol}`,
            type: 'momentum',
            severity: this.severity.INFO,
            message: `${h.symbol} appears oversold (RSI ${rsi14.toFixed(1)} < 30).`,
            suggestedAction: 'Potential accumulation opportunity if fundamentals align.'
          });
        }
      }

      if (volatility30d != null && volatility30d > 0.6) {
        signals.push({
          id: `high_vol_${h.symbol}`,
          type: 'momentum',
          severity: this.severity.WARNING,
          message: `${h.symbol} 30-day volatility is high (${(volatility30d*100).toFixed(1)}%).`,
          suggestedAction: 'Expect larger price swings; size positions accordingly.'
        });
      }
    });

    return signals;
  }

  checkValuation(context) {
    const { holdings } = context;
    const signals = [];
    if (holdings.length === 0) return signals;

    // Group by sector to calculate sector median PE & PBV
    const sectorStats = {};
    holdings.forEach((h) => {
      const sector = h.sector || 'Unknown';
      if (!sectorStats[sector]) {
        sectorStats[sector] = { pe: [], pbv: [] };
      }
      if (h.instrument.peRatio != null) sectorStats[sector].pe.push(h.instrument.peRatio);
      if (h.instrument.pbvRatio != null) sectorStats[sector].pbv.push(h.instrument.pbvRatio);
    });

    const calcMedian = (arr) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const len = sorted.length;
      if (len === 0) return null;
      const mid = Math.floor(len / 2);
      return len % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    holdings.forEach((h) => {
      const { peRatio, pbvRatio } = h.instrument;
      const sector = h.sector || 'Unknown';
      const medPe = calcMedian(sectorStats[sector].pe);
      const medPbv = calcMedian(sectorStats[sector].pbv);

      if (peRatio != null && medPe != null) {
        const diff = (peRatio - medPe) / medPe;
        if (diff > 0.4) {
          signals.push({
            id: `overvalued_pe_${h.symbol}`,
            type: 'valuation',
            severity: this.severity.WARNING,
            message: `${h.symbol} P/E is ${peRatio.toFixed(1)} vs sector median ${medPe.toFixed(1)} (+${(diff*100).toFixed(0)}%).`,
            suggestedAction: 'Consider trimming position or awaiting better entry point.',
            details: { symbol: h.symbol, peRatio, sectorMedianPE: medPe }
          });
        } else if (diff < -0.4) {
          signals.push({
            id: `undervalued_pe_${h.symbol}`,
            type: 'valuation',
            severity: this.severity.INFO,
            message: `${h.symbol} appears undervalued vs peers (P/E ${peRatio.toFixed(1)} < sector median ${medPe.toFixed(1)}).`,
            suggestedAction: 'Potential accumulation opportunity.',
            details: { symbol: h.symbol, peRatio, sectorMedianPE: medPe }
          });
        }
      }

      if (pbvRatio != null && medPbv != null) {
        const diff = (pbvRatio - medPbv) / medPbv;
        if (diff > 0.4) {
          signals.push({
            id: `overvalued_pbv_${h.symbol}`,
            type: 'valuation',
            severity: this.severity.WARNING,
            message: `${h.symbol} P/BV is ${pbvRatio.toFixed(1)} vs sector median ${medPbv.toFixed(1)} (+${(diff*100).toFixed(0)}%).`,
            details: { symbol: h.symbol, pbvRatio, sectorMedianPBV: medPbv }
          });
        }
      }
    });

    return signals;
  }

  analyzeSectorAllocation(context) {
    const { sectorAllocation, totalMarketValue } = context;
    const signals = [];
    
    // Check for under/over allocation vs. benchmark
    for (const [sector, alloc] of Object.entries(sectorAllocation)) {
      const benchmark = this.sectorBenchmarks[sector] || { weight: 0.05 };
      const diff = alloc.weight.minus(benchmark.weight);
      
      if (diff.greaterThan(0.1)) { // 10% over benchmark
        signals.push({
          id: `sector_overweight_${sector.toLowerCase().replace(/\s+/g, '_')}`,
          type: 'sector_allocation',
          severity: this.severity.WARNING,
          message: `Portfolio is overweight ${sector} sector by ${diff.times(100).toFixed(1)}% vs. benchmark.`,
          suggestedAction: 'Consider rebalancing to reduce concentration risk.',
          details: {
            sector,
            currentWeight: alloc.weight.toNumber(),
            benchmarkWeight: benchmark.weight,
            value: alloc.value.toNumber()
          }
        });
      } else if (diff.lessThan(-0.05)) { // 5% under benchmark
        signals.push({
          id: `sector_underweight_${sector.toLowerCase().replace(/\s+/g, '_')}`,
          type: 'sector_allocation',
          severity: this.severity.INFO,
          message: `Portfolio is underweight ${sector} sector by ${Math.abs(diff.times(100).toNumber()).toFixed(1)}% vs. benchmark.`,
          suggestedAction: 'Consider adding exposure to this sector for better diversification.',
          details: {
            sector,
            currentWeight: alloc.weight.toNumber(),
            benchmarkWeight: benchmark.weight,
            value: alloc.value.toNumber()
          }
        });
      }
    }
    
    return signals;
  }

  // New method to check liquidity of holdings
  checkLiquidity(context) {
    const { holdings, totalValue } = context;
    const signals = [];
    
    // Check if portfolio has sufficient liquid assets
    const liquidAssets = holdings.reduce((sum, h) => {
      // Consider an asset liquid if it has high average daily volume
      const isLiquid = h.avgDailyVolume > 100000; // 100k+ shares traded daily
      return isLiquid ? sum.plus(h.marketValue) : sum;
    }, new Decimal(0));
    
    const liquidRatio = liquidAssets.dividedBy(totalValue);
    
    if (liquidRatio.lessThan(0.7)) {
      signals.push({
        id: 'low_liquidity_warning',
        type: 'liquidity',
        severity: this.severity.WARNING,
        message: 'Less than 70% of portfolio is in liquid assets.',
        suggestedAction: 'Consider increasing allocation to more liquid securities for better flexibility.',
        details: {
          liquidRatio: liquidRatio.toNumber(),
          liquidValue: liquidAssets.toNumber()
        }
      });
    }
    
    return signals;
  }

  // New method to identify tax-loss harvesting opportunities
  identifyTaxOpportunities(context) {
    const { holdings } = context;
    const signals = [];
    const now = new Date();
    
    // Look for positions with losses that could be harvested
    const taxLossCandidates = holdings.filter(h => 
      h.totalReturn.lt(0) && h.daysHeld > 30 // Only consider positions held >30 days
    );
    
    taxLossCandidates.forEach(h => {
      const lossPct = h.returnPct * -1; // Convert to positive for display
      if (lossPct > 10) { // Only suggest for significant losses
        signals.push({
          id: `tax_loss_opportunity_${h.symbol}`,
          type: 'tax_optimization',
          severity: this.severity.INFO,
          message: `Consider tax-loss harvesting on ${h.symbol} (${lossPct.toFixed(1)}% loss)`,
          suggestedAction: 'Sell to realize tax loss, then buy a similar security after 30 days to avoid wash sale rules.',
          details: {
            symbol: h.symbol,
            purchaseDate: h.purchaseDate,
            daysHeld: h.daysHeld,
            lossAmount: h.totalReturn.abs().toNumber(),
            lossPct: lossPct
          }
        });
      }
    });
    
    return signals;
  }

  // New method to analyze performance attribution
  analyzePerformance(context) {
    const { holdings, totalMarketValue, totalInvested } = context;
    
    if (holdings.length === 0) {
      return {
        totalReturn: 0,
        annualizedReturn: 0,
        bestPerformers: [],
        worstPerformers: [],
        sectorReturns: {}
      };
    }
    
    // Calculate total portfolio return
    const totalReturn = totalMarketValue.minus(totalInvested);
    const totalReturnPct = totalInvested.gt(0) ? 
      totalReturn.dividedBy(totalInvested).times(100).toNumber() : 0;
    
    // Calculate weighted average holding period (days)
    let totalWeightedDays = 0;
    let totalWeight = 0;
    
    holdings.forEach(h => {
      const weight = h.marketValue.dividedBy(totalMarketValue);
      totalWeightedDays += h.daysHeld * weight.toNumber();
      totalWeight += weight.toNumber();
    });
    
    const avgHoldingDays = Math.round(totalWeightedDays / (totalWeight || 1));
    
    // Annualize return
    const annualizedReturn = avgHoldingDays > 0 ? 
      Math.pow(1 + (totalReturnPct / 100), 365 / avgHoldingDays) - 1 : 0;
    
    // Identify best and worst performers
    const sortedByPerformance = [...holdings].sort((a, b) => 
      b.annualizedReturn - a.annualizedReturn
    );
    
    const bestPerformers = sortedByPerformance
      .slice(0, 3)
      .map(h => ({
        symbol: h.symbol,
        returnPct: h.returnPct,
        annualizedReturn: h.annualizedReturn,
        contribution: h.marketValue.dividedBy(totalMarketValue).times(h.returnPct).toNumber()
      }));
      
    const worstPerformers = [...sortedByPerformance]
      .reverse()
      .slice(0, 3)
      .map(h => ({
        symbol: h.symbol,
        returnPct: h.returnPct,
        annualizedReturn: h.annualizedReturn,
        contribution: h.marketValue.dividedBy(totalMarketValue).times(h.returnPct).toNumber()
      }));
    
    // Calculate sector returns
    const sectorReturns = {};
    holdings.forEach(h => {
      const sector = h.sector || 'Unknown';
      if (!sectorReturns[sector]) {
        sectorReturns[sector] = {
          returnPct: 0,
          marketValue: new Decimal(0),
          contribution: new Decimal(0)
        };
      }
      sectorReturns[sector].returnPct += h.returnPct * h.marketValue.dividedBy(totalMarketValue).toNumber();
      sectorReturns[sector].marketValue = sectorReturns[sector].marketValue.plus(h.marketValue);
      sectorReturns[sector].contribution = sectorReturns[sector].contribution.plus(
        h.marketValue.dividedBy(totalMarketValue).times(h.returnPct)
      );
    });
    
    // Convert Decimal values to numbers for the response
    const formattedSectorReturns = {};
    Object.entries(sectorReturns).forEach(([sector, data]) => {
      formattedSectorReturns[sector] = {
        returnPct: data.returnPct,
        marketValue: data.marketValue.toNumber(),
        contribution: data.contribution.toNumber(),
        weight: data.marketValue.dividedBy(totalMarketValue).toNumber()
      };
    });
    
    return {
      totalReturn: totalReturn.toNumber(),
      totalReturnPct,
      annualizedReturn: annualizedReturn * 100, // Convert to percentage
      avgHoldingDays,
      bestPerformers,
      worstPerformers,
      sectorReturns: formattedSectorReturns,
      asOfDate: new Date().toISOString()
    };
  }

  buildSummary(context, signals, performance) {
    const { totalValue, totalInvested, holdings, cashNg, sectorAllocation } = context;

    let baseScore = 80;

    // Penalize if no holdings or value
    if (holdings.length === 0 || totalValue.lte(0)) {
      baseScore = 0;
    }

    // Apply penalties for high severity signals
    const highCount = signals.filter((s) => s.severity === this.severity.HIGH).length;
    const warningCount = signals.filter((s) => s.severity === this.severity.WARNING).length;

    // Adjust score based on diversification
    const sectorCount = Object.keys(sectorAllocation).length;
    const diversificationScore = Math.min(20, sectorCount * 2); // Up to 20 points for diversification
    
    // Adjust score based on performance (if data is available)
    const performanceScore = performance?.annualizedReturn ? 
      Math.min(10, Math.max(-10, performance.annualizedReturn / 2)) : 0;

    baseScore = baseScore - (highCount * 10) - (warningCount * 3) + diversificationScore + performanceScore;
    baseScore = Math.max(0, Math.min(100, baseScore)); // Clamp between 0-100

    let riskLevel = 'low';
    if (baseScore < 40) riskLevel = 'high';
    else if (baseScore < 70) riskLevel = 'medium';

    const keyFindings = [];
    
    // Add performance summary
    if (performance?.totalReturnPct !== undefined) {
      const perfAdjective = performance.totalReturnPct >= 0 ? 'positive' : 'negative';
      keyFindings.push(`Portfolio has ${perfAdjective} returns of ${Math.abs(performance.totalReturnPct).toFixed(1)}%`);
    }
    
    // Add diversification summary
    if (sectorCount >= 5) {
      keyFindings.push(`Well-diversified across ${sectorCount} sectors`);
    } else if (sectorCount > 0) {
      keyFindings.push(`Limited diversification (${sectorCount} sectors)`);
    }
    
    // Add cash position summary
    const cashPct = cashNg.dividedBy(totalValue).times(100).toNumber();
    if (cashPct > 30) {
      keyFindings.push(`High cash position (${cashPct.toFixed(0)}% of portfolio)`);
    } else if (cashPct < 5) {
      keyFindings.push('Low cash position - consider maintaining at least 5% for opportunities');
    }

    // Add signal-based findings
    if (highCount > 0) keyFindings.push(`${highCount} high-priority issues to address`);
    if (warningCount > 0) keyFindings.push(`${warningCount} recommendations for improvement`);

    if (keyFindings.length === 0 && holdings.length > 0) {
      keyFindings.push('Portfolio appears well-constructed with good diversification.');
    }

    return {
      score: Math.round(baseScore),
      riskLevel,
      keyFindings,
      stats: {
        totalValue: totalValue.toNumber(),
        totalInvested: totalInvested.toNumber(),
        cashNg: cashNg.toNumber(),
        cashPct,
        holdingCount: holdings.length,
        sectorCount,
        asOfDate: context.asOfDate || new Date().toISOString()
      },
      performance: performance || {}
    };
  }
}

module.exports = new PortfolioRecommendationService();
