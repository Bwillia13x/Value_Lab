/**
 * Performance Metrics Engine
 * Implements all KPIs required for the Value-Investor Performance Lab
 * All calculations are deterministic and match Excel within ±1 basis point
 */

// Type definitions
export interface PriceData {
  date: Date;
  value: number;
}

export interface ReturnData {
  date: Date;
  return: number;
}

export interface RollingAlphaResult {
  date: Date;
  alpha3yr: number | null;
  alpha5yr: number | null;
  alpha10yr: number | null;
}

export interface DrawdownData {
  maxDrawdown: number;
  maxDrawdownStart: Date;
  maxDrawdownEnd: Date;
  currentDrawdown: number;
  drawdownSeries: Array<{
    date: Date;
    drawdown: number;
  }>;
}

/**
 * Calculate daily returns from price series
 * @param prices Array of price data points
 * @returns Array of return data points
 */
export function calculateReturns(prices: PriceData[]): ReturnData[] {
  if (prices.length < 2) return [];
  
  const sortedPrices = [...prices].sort((a, b) => a.date.getTime() - b.date.getTime());
  const returns: ReturnData[] = [];
  
  for (let i = 1; i < sortedPrices.length; i++) {
    const prevPrice = sortedPrices[i - 1].value;
    const currPrice = sortedPrices[i].value;
    
    let returnValue: number;
    if (prevPrice === 0) {
      if (currPrice === 0) {
        // Undefined return (0/0), skip this point
        continue;
      }
      returnValue = currPrice > 0 ? Infinity : -Infinity;
    } else {
      returnValue = (currPrice - prevPrice) / prevPrice;
    }
    
    returns.push({
      date: sortedPrices[i].date,
      return: returnValue
    });
  }
  
  return returns;
}

/**
 * Calculate Compound Annual Growth Rate (CAGR)
 * @param startValue Starting portfolio value
 * @param endValue Ending portfolio value
 * @param years Number of years
 * @returns CAGR as a decimal (e.g., 0.08 for 8%)
 */
export function calculateCAGR(startValue: number, endValue: number, years: number): number {
  if (startValue <= 0 || endValue <= 0 || years <= 0) {
    throw new Error('All values must be positive');
  }
  
  // Using precise calculation to match Excel
  const ratio = endValue / startValue;
  const exponent = 1 / years;
  const cagr = Math.pow(ratio, exponent) - 1;
  
  // Round to 4 decimal places (0.01 basis points)
  return Math.round(cagr * 10000) / 10000;
}

/**
 * Calculate rolling alpha vs benchmark (S&P 500)
 * @param portfolioReturns Portfolio return series
 * @param benchmarkReturns Benchmark return series
 * @param periods Object containing period definitions (3yr, 5yr, 10yr)
 * @returns Array of rolling alpha calculations
 */
export function calculateRollingAlpha(
  portfolioReturns: ReturnData[],
  benchmarkReturns: ReturnData[]
): RollingAlphaResult[] {
  const results: RollingAlphaResult[] = [];
  
  // Align dates between portfolio and benchmark
  const alignedData = alignReturnSeries(portfolioReturns, benchmarkReturns);
  
  // Trading days per year (approximate)
  const tradingDaysPerYear = 252;
  const periods = {
    '3yr': 3 * tradingDaysPerYear,
    '5yr': 5 * tradingDaysPerYear,
    '10yr': 10 * tradingDaysPerYear
  };
  
  for (let i = 0; i < alignedData.portfolio.length; i++) {
    const currentDate = alignedData.portfolio[i].date;
    
    const alpha3yr = i >= periods['3yr'] - 1 
      ? calculatePeriodAlpha(alignedData, i - periods['3yr'] + 1, i + 1)
      : null;
      
    const alpha5yr = i >= periods['5yr'] - 1
      ? calculatePeriodAlpha(alignedData, i - periods['5yr'] + 1, i + 1)
      : null;
      
    const alpha10yr = i >= periods['10yr'] - 1
      ? calculatePeriodAlpha(alignedData, i - periods['10yr'] + 1, i + 1)
      : null;
    
    results.push({
      date: currentDate,
      alpha3yr,
      alpha5yr,
      alpha10yr
    });
  }
  
  return results;
}

/**
 * Calculate maximum drawdown and drawdown series
 * @param prices Price series
 * @returns Drawdown analysis data
 */
export function calculateMaxDrawdown(prices: PriceData[]): DrawdownData {
  if (prices.length === 0) {
    throw new Error('Price series cannot be empty');
  }
  
  const sortedPrices = [...prices].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  let maxDrawdown = 0;
  let maxDrawdownStart = sortedPrices[0].date;
  let maxDrawdownEnd = sortedPrices[0].date;
  let peak = sortedPrices[0].value;
  let peakDate = sortedPrices[0].date;
  const drawdownSeries: Array<{ date: Date; drawdown: number }> = [];
  
  for (const price of sortedPrices) {
    // Update peak
    if (price.value > peak) {
      peak = price.value;
      peakDate = price.date;
    }
    
    // Calculate current drawdown
    const currentDrawdown = peak > 0 ? (peak - price.value) / peak : 0;
    drawdownSeries.push({
      date: price.date,
      drawdown: currentDrawdown
    });
    
    // Update max drawdown if necessary
    if (currentDrawdown > maxDrawdown) {
      maxDrawdown = currentDrawdown;
      maxDrawdownStart = peakDate;
      maxDrawdownEnd = price.date;
    }
  }
  
  const lastDrawdown = drawdownSeries[drawdownSeries.length - 1]?.drawdown || 0;
  
  return {
    maxDrawdown: Math.round(maxDrawdown * 10000) / 10000, // Round to basis points
    maxDrawdownStart,
    maxDrawdownEnd,
    currentDrawdown: Math.round(lastDrawdown * 10000) / 10000,
    drawdownSeries
  };
}

/**
 * Calculate hit ratio (percentage of positive return periods)
 * @param returns Return series
 * @returns Hit ratio as a decimal (e.g., 0.55 for 55%)
 */
export function calculateHitRatio(returns: ReturnData[]): number {
  if (returns.length === 0) return 0;
  
  const positiveReturns = returns.filter(r => r.return > 0).length;
  const hitRatio = positiveReturns / returns.length;
  
  return Math.round(hitRatio * 10000) / 10000;
}

/**
 * Calculate Sortino Ratio
 * @param returns Return series
 * @param targetReturn Minimum acceptable return (MAR)
 * @returns Sortino ratio
 */
export function calculateSortinoRatio(
  returns: ReturnData[],
  targetReturn: number = 0
): number {
  if (returns.length === 0) return 0;
  
  const returnValues = returns.map(r => r.return);
  const avgReturn = returnValues.reduce((sum, r) => sum + r, 0) / returnValues.length;
  
  // Calculate downside deviation
  const downsideReturns = returnValues.filter(r => r < targetReturn);
  if (downsideReturns.length === 0) return Infinity;
  
  const downsideSquares = downsideReturns.map(r => Math.pow(r - targetReturn, 2));
  const downsideVariance = downsideSquares.reduce((sum, sq) => sum + sq, 0) / returns.length;
  const downsideDeviation = Math.sqrt(downsideVariance);
  
  if (downsideDeviation === 0) return Infinity;
  
  // Annualize the ratio (assuming daily returns)
  const annualizedExcessReturn = (avgReturn - targetReturn) * 252;
  const annualizedDownsideDeviation = downsideDeviation * Math.sqrt(252);
  
  const sortinoRatio = annualizedExcessReturn / annualizedDownsideDeviation;
  
  return Math.round(sortinoRatio * 10000) / 10000;
}

/**
 * Calculate Information Ratio
 * @param portfolioReturns Portfolio return series
 * @param benchmarkReturns Benchmark return series
 * @returns Information ratio
 */
export function calculateInformationRatio(
  portfolioReturns: ReturnData[],
  benchmarkReturns: ReturnData[]
): number {
  const alignedData = alignReturnSeries(portfolioReturns, benchmarkReturns);
  
  if (alignedData.portfolio.length === 0) return 0;
  
  // Calculate active returns
  const activeReturns: number[] = [];
  for (let i = 0; i < alignedData.portfolio.length; i++) {
    const activeReturn = alignedData.portfolio[i].return - alignedData.benchmark[i].return;
    activeReturns.push(activeReturn);
  }
  
  // Calculate average active return
  const avgActiveReturn = activeReturns.reduce((sum, r) => sum + r, 0) / activeReturns.length;
  
  // Calculate tracking error (standard deviation of active returns)
  const squaredDiffs = activeReturns.map(r => Math.pow(r - avgActiveReturn, 2));
  const variance = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / (activeReturns.length - 1);
  const trackingError = Math.sqrt(variance);
  
  if (trackingError === 0) return 0;
  
  // Annualize the ratio
  const annualizedActiveReturn = avgActiveReturn * 252;
  const annualizedTrackingError = trackingError * Math.sqrt(252);
  
  const informationRatio = annualizedActiveReturn / annualizedTrackingError;
  
  return Math.round(informationRatio * 10000) / 10000;
}

// Helper functions

/**
 * Align two return series by date
 */
function alignReturnSeries(
  series1: ReturnData[],
  series2: ReturnData[]
): { portfolio: ReturnData[]; benchmark: ReturnData[] } {
  const dateMap1 = new Map(series1.map(r => [r.date.toISOString(), r]));
  const dateMap2 = new Map(series2.map(r => [r.date.toISOString(), r]));
  
  const commonDates = Array.from(dateMap1.keys()).filter(date => dateMap2.has(date));
  commonDates.sort();
  
  const alignedPortfolio: ReturnData[] = [];
  const alignedBenchmark: ReturnData[] = [];
  
  for (const dateStr of commonDates) {
    const portfolioReturn = dateMap1.get(dateStr)!;
    const benchmarkReturn = dateMap2.get(dateStr)!;
    
    alignedPortfolio.push(portfolioReturn);
    alignedBenchmark.push(benchmarkReturn);
  }
  
  return {
    portfolio: alignedPortfolio,
    benchmark: alignedBenchmark
  };
}

/**
 * Calculate alpha for a specific period
 */
function calculatePeriodAlpha(
  alignedData: { portfolio: ReturnData[]; benchmark: ReturnData[] },
  startIndex: number,
  endIndex: number
): number {
  const periodPortfolio = alignedData.portfolio.slice(startIndex, endIndex);
  const periodBenchmark = alignedData.benchmark.slice(startIndex, endIndex);
  
  // Calculate cumulative returns
  const portfolioCumReturn = periodPortfolio.reduce((cum, r) => cum * (1 + r.return), 1) - 1;
  const benchmarkCumReturn = periodBenchmark.reduce((cum, r) => cum * (1 + r.return), 1) - 1;
  
  // Calculate annualized returns
  const days = periodPortfolio.length;
  const years = days / 252;
  
  const portfolioAnnualized = Math.pow(1 + portfolioCumReturn, 1 / years) - 1;
  const benchmarkAnnualized = Math.pow(1 + benchmarkCumReturn, 1 / years) - 1;
  
  // Alpha is the difference in annualized returns
  const alpha = portfolioAnnualized - benchmarkAnnualized;
  
  return Math.round(alpha * 10000) / 10000;
}

/**
 * Seeded random number generator for deterministic Monte Carlo simulations
 */
export class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  /**
   * Generate a random number between 0 and 1
   */
  next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
  
  /**
   * Generate a normally distributed random number
   * @param mean Mean of the distribution
   * @param stdDev Standard deviation
   */
  nextGaussian(mean: number = 0, stdDev: number = 1): number {
    // Box-Muller transform
    const u1 = this.next();
    const u2 = this.next();
    
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z0 * stdDev + mean;
  }
}

/**
 * Calculate annualized volatility from return series
 * @param returns Return series
 * @returns Annualized volatility
 */
export function calculateVolatility(returns: ReturnData[]): number {
  if (returns.length < 2) return 0;
  
  const returnValues = returns.map(r => r.return);
  const mean = returnValues.reduce((sum, r) => sum + r, 0) / returnValues.length;
  
  const squaredDiffs = returnValues.map(r => Math.pow(r - mean, 2));
  const variance = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / (returnValues.length - 1);
  const dailyVolatility = Math.sqrt(variance);
  
  // Annualize the volatility
  const annualizedVolatility = dailyVolatility * Math.sqrt(252);
  
  return Math.round(annualizedVolatility * 10000) / 10000;
}

/**
 * Calculate Sharpe Ratio
 * @param returns Return series
 * @param riskFreeRate Annual risk-free rate
 * @returns Sharpe ratio
 */
export function calculateSharpeRatio(
  returns: ReturnData[],
  riskFreeRate: number = 0.02
): number {
  if (returns.length === 0) return 0;
  
  const returnValues = returns.map(r => r.return);
  const avgReturn = returnValues.reduce((sum, r) => sum + r, 0) / returnValues.length;
  
  // Convert annual risk-free rate to daily
  const dailyRiskFreeRate = Math.pow(1 + riskFreeRate, 1/252) - 1;
  
  // Calculate excess returns
  const excessReturns = returnValues.map(r => r - dailyRiskFreeRate);
  const avgExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
  
  // Calculate standard deviation of returns
  const squaredDiffs = returnValues.map(r => Math.pow(r - avgReturn, 2));
  const variance = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / (returnValues.length - 1);
  const stdDev = Math.sqrt(variance);
  
  if (stdDev === 0) return 0;
  
  // Annualize the ratio
  const annualizedExcessReturn = avgExcessReturn * 252;
  const annualizedStdDev = stdDev * Math.sqrt(252);
  
  const sharpeRatio = annualizedExcessReturn / annualizedStdDev;
  
  return Math.round(sharpeRatio * 10000) / 10000;
}