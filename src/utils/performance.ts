import { mean as ssMean } from 'simple-statistics';

/**
 * Compound annual growth rate.
 * @param returns Array of periodic gross returns expressed as decimals. Example: 0.01 = 1%.
 * @param periodsPerYear Number of periods per calendar year (e.g. 252 for daily, 12 for monthly).
 * @returns CAGR as decimal (e.g. 0.08 = 8%).
 */
export function cagr(returns: number[], periodsPerYear: number): number {
  validateReturns(returns);
  if (!Number.isFinite(periodsPerYear) || periodsPerYear <= 0) {
    throw new Error('periodsPerYear must be a positive number');
  }
  const totalGrowth = returns.reduce((acc, r) => acc * (1 + r), 1);
  const years = returns.length / periodsPerYear;
  if (years === 0) return 0;
  return Math.pow(totalGrowth, 1 / years) - 1;
}

/**
 * Rolling alpha (annualised) versus a benchmark.
 * @param portfolio Portfolio periodic returns.
 * @param benchmark Benchmark periodic returns (same length & frequency).
 * @param windowYears Size of the rolling window in years (3, 5 or 10).
 * @param periodsPerYear Periods per year.
 * @returns Array of alpha values aligned to the end index of each window.
 */
export function rollingAlpha(
  portfolio: number[],
  benchmark: number[],
  windowYears: 3 | 5 | 10,
  periodsPerYear: number,
): number[] {
  validateSameLength(portfolio, benchmark);
  if (!Number.isFinite(periodsPerYear) || periodsPerYear <= 0) {
    throw new Error('periodsPerYear must be a positive number');
  }

  const windowSize = windowYears * periodsPerYear;
  if (windowSize > portfolio.length) {
    throw new Error('Window size longer than series length');
  }

  const output: number[] = [];
  let portProduct = 1;
  let benchProduct = 1;

  // initialise first window
  for (let i = 0; i < windowSize; i++) {
    portProduct *= 1 + portfolio[i];
    benchProduct *= 1 + benchmark[i];
  }
  output.push(alphaFromProducts(portProduct, benchProduct, windowSize, periodsPerYear));

  // slide window
  for (let end = windowSize; end < portfolio.length; end++) {
    const outIdx = end - windowSize;
    // Remove old period contribution
    portProduct /= 1 + portfolio[outIdx];
    benchProduct /= 1 + benchmark[outIdx];
    // Add new period
    portProduct *= 1 + portfolio[end];
    benchProduct *= 1 + benchmark[end];

    output.push(alphaFromProducts(portProduct, benchProduct, windowSize, periodsPerYear));
  }
  return output;
}

/**
 * Maximum drawdown magnitude (positive decimal, e.g. 0.32 for -32%).
 * @param returns Series of periodic returns.
 */
export function maxDrawdown(returns: number[]): number {
  validateReturns(returns);
  let peak = 1;
  let value = 1;
  let maxDD = 0;
  for (const r of returns) {
    value *= 1 + r;
    if (value > peak) peak = value;
    const drawdown = (peak - value) / peak; // positive magnitude
    if (drawdown > maxDD) maxDD = drawdown;
  }
  return maxDD;
}

/** Fraction of periods with a positive return. */
export function hitRatio(returns: number[]): number {
  validateReturns(returns);
  const hits = returns.filter((r) => r > 0).length;
  return hits / returns.length;
}

/**
 * Sortino ratio.
 */
export function sortinoRatio(returns: number[], riskFree = 0, periodsPerYear: number): number {
  validateReturns(returns);
  if (!Number.isFinite(riskFree)) {
    throw new Error('riskFree must be a finite number');
  }
  if (!Number.isFinite(periodsPerYear) || periodsPerYear <= 0) {
    throw new Error('periodsPerYear must be a positive number');
  }
  const excess = returns.map((r) => r - riskFree);
  const meanExcess = ssMean(excess);
  const downside = excess.filter((r) => r < 0);
  if (downside.length === 0) return Infinity;
  const downsideDev = populationStdDev(downside);
  const annualisedReturn = meanExcess * periodsPerYear;
  const annualisedDownDev = downsideDev * Math.sqrt(periodsPerYear);
  return annualisedReturn / annualisedDownDev;
}

/**
 * Information ratio.
 */
export function informationRatio(
  portfolio: number[],
  benchmark: number[],
  periodsPerYear: number,
): number {
  validateSameLength(portfolio, benchmark);
  if (!Number.isFinite(periodsPerYear) || periodsPerYear <= 0) {
    throw new Error('periodsPerYear must be a positive number');
  }
  const active = portfolio.map((p, i) => p - benchmark[i]);
  const meanActive = ssMean(active);
  const trackingErr = populationStdDev(active);
  if (trackingErr === 0) return Infinity;
  const annualisedActive = meanActive * periodsPerYear;
  const annualisedTE = trackingErr * Math.sqrt(periodsPerYear);
  return annualisedActive / annualisedTE;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function validateReturns(arr: number[]): void {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error('returns must be a non-empty array');
  }
  if (arr.some((v) => !Number.isFinite(v))) {
    throw new Error('returns contain non-finite numbers');
  }
}

function validateSameLength(a: number[], b: number[]): void {
  validateReturns(a);
  validateReturns(b);
  if (a.length !== b.length) {
    throw new Error('series must be of equal length');
  }
}

function populationStdDev(data: number[]): number {
  if (data.length === 0) return 0;
  const m = ssMean(data);
  const variance = data.reduce((acc, v) => acc + (v - m) ** 2, 0) / data.length;
  return Math.sqrt(variance);
}

function alphaFromProducts(
  portProduct: number,
  benchProduct: number,
  windowSize: number,
  periodsPerYear: number,
): number {
  const portCAGR = Math.pow(portProduct, periodsPerYear / windowSize) - 1;
  const benchCAGR = Math.pow(benchProduct, periodsPerYear / windowSize) - 1;
  return portCAGR - benchCAGR;
}
