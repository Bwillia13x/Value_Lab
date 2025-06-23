export type NumericArray = number[];

/**
 * Calculate Compound Annual Growth Rate (CAGR).
 *
 * @param prices - Array of price levels in chronological order (earliest → latest).
 * @param periodsPerYear - Number of data points per year (e.g. 252 for daily, 12 for monthly).
 * @returns Annualised CAGR expressed as a decimal (e.g. 0.1 ⇒ 10 %). Returns 0 for invalid series.
 */
export function calculateCagr(prices: NumericArray, periodsPerYear: number): number {
  if (!Array.isArray(prices) || prices.length < 2 || periodsPerYear <= 0) {
    return 0;
  }
  const start = prices[0];
  const end = prices[prices.length - 1];
  if (start <= 0 || end <= 0) return 0;
  const years = (prices.length - 1) / periodsPerYear;
  if (years === 0) return 0;
  return Math.pow(end / start, 1 / years) - 1;
}

/**
 * Calculate maximum drawdown in the series.
 *
 * @param prices - Array of price levels in chronological order.
 * @returns The worst drawdown expressed as a negative decimal (e.g. -0.3 ⇒ -30 %).
 */
export function maxDrawdown(prices: NumericArray): number {
  if (!Array.isArray(prices) || prices.length === 0) return 0;
  let peak = prices[0];
  let maxDd = 0;
  for (const p of prices) {
    peak = Math.max(peak, p);
    if (peak !== 0) {
      const dd = (p - peak) / peak; // negative or zero
      if (dd < maxDd) {
        maxDd = dd;
      }
    }
  }
  return maxDd; // negative value (or 0)
}

/**
 * Hit ratio of a return series.
 *
 * @param returns - Array of periodic returns for the asset.
 * @param benchmarkReturns - Optional benchmark returns. If provided, hit ratio is % of periods the asset beats benchmark; otherwise, % of periods with positive return.
 * @returns Hit ratio between 0 and 1.
 */
export function hitRatio(returns: NumericArray, benchmarkReturns?: NumericArray): number {
  if (!Array.isArray(returns) || returns.length === 0) return 0;
  if (benchmarkReturns && returns.length !== benchmarkReturns.length) {
    throw new Error('returns and benchmarkReturns must be the same length');
  }
  let hits = 0;
  let total = returns.length;
  for (let i = 0; i < returns.length; i++) {
    const r = returns[i];
    const hit = benchmarkReturns ? r > benchmarkReturns[i] : r > 0;
    if (hit) hits += 1;
  }
  return hits / total;
}

// ---------- Helper statistics utilities ----------

function mean(arr: NumericArray): number {
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

function sampleStdDev(arr: NumericArray): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((acc, v) => acc + Math.pow(v - m, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

// ---------- Risk-adjusted ratios ----------

/**
 * Sortino ratio.
 *
 * @param returns - Periodic returns.
 * @param periodsPerYear - e.g. 252 for daily data.
 * @param targetReturn - Minimum acceptable return, defaults to 0.
 * @returns Annualised Sortino ratio (0 when downside deviation is 0).
 */
export function sortinoRatio(
  returns: NumericArray,
  periodsPerYear: number,
  targetReturn = 0,
): number {
  if (!Array.isArray(returns) || returns.length === 0 || periodsPerYear <= 0) return 0;
  const excess = returns.map((r) => r - targetReturn);
  const meanExcess = mean(excess);
  const downside = excess.filter((r) => r < 0);
  if (downside.length === 0) return 0;
  const downsideDev = Math.sqrt(downside.reduce((acc, r) => acc + r * r, 0) / downside.length);
  if (downsideDev === 0) return 0;
  return (meanExcess * periodsPerYear) / (downsideDev * Math.sqrt(periodsPerYear));
}

/**
 * Information ratio.
 *
 * @param returns - Asset periodic returns.
 * @param benchmarkReturns - Benchmark periodic returns.
 * @param periodsPerYear - e.g. 252 for daily data.
 * @returns Annualised information ratio (0 when tracking error is 0).
 */
export function informationRatio(
  returns: NumericArray,
  benchmarkReturns: NumericArray,
  periodsPerYear: number,
): number {
  if (
    !Array.isArray(returns) ||
    !Array.isArray(benchmarkReturns) ||
    returns.length === 0 ||
    returns.length !== benchmarkReturns.length ||
    periodsPerYear <= 0
  ) {
    return 0;
  }
  const active = returns.map((r, i) => r - benchmarkReturns[i]);
  const meanActive = mean(active);
  const trackingError = sampleStdDev(active);
  if (trackingError === 0) return 0;
  return (meanActive * periodsPerYear) / (trackingError * Math.sqrt(periodsPerYear));
}

// ---------- Rolling alpha ----------

function cagrFromReturns(retWindow: NumericArray, periodsPerYear: number): number {
  const growth = retWindow.reduce((acc, r) => acc * (1 + r), 1);
  const years = retWindow.length / periodsPerYear;
  if (years === 0) return 0;
  return Math.pow(growth, 1 / years) - 1;
}

/**
 * Rolling alpha (asset CAGR – benchmark CAGR) over a specified window.
 *
 * @param returns - Asset periodic returns.
 * @param benchmarkReturns - Benchmark periodic returns.
 * @param periodsPerYear - e.g. 252 for daily data.
 * @param windowYears - Desired window length in years.
 * @returns Array of alphas where index corresponds to window end.
 */
export function rollingAlpha(
  returns: NumericArray,
  benchmarkReturns: NumericArray,
  periodsPerYear: number,
  windowYears: number,
): NumericArray {
  if (
    !Array.isArray(returns) ||
    !Array.isArray(benchmarkReturns) ||
    returns.length !== benchmarkReturns.length ||
    returns.length === 0 ||
    periodsPerYear <= 0 ||
    windowYears <= 0
  ) {
    return [];
  }
  const windowSize = Math.round(windowYears * periodsPerYear);
  if (windowSize > returns.length) return [];

  const alphas: number[] = [];
  for (let end = windowSize; end <= returns.length; end++) {
    const start = end - windowSize;
    const assetCagr = cagrFromReturns(returns.slice(start, end), periodsPerYear);
    const benchCagr = cagrFromReturns(benchmarkReturns.slice(start, end), periodsPerYear);
    alphas.push(assetCagr - benchCagr);
  }
  return alphas;
}

// Convenience wrappers for common window sizes
export function rollingAlpha3Y(
  returns: NumericArray,
  benchmarkReturns: NumericArray,
  periodsPerYear: number,
): NumericArray {
  return rollingAlpha(returns, benchmarkReturns, periodsPerYear, 3);
}

export function rollingAlpha5Y(
  returns: NumericArray,
  benchmarkReturns: NumericArray,
  periodsPerYear: number,
): NumericArray {
  return rollingAlpha(returns, benchmarkReturns, periodsPerYear, 5);
}

export function rollingAlpha10Y(
  returns: NumericArray,
  benchmarkReturns: NumericArray,
  periodsPerYear: number,
): NumericArray {
  return rollingAlpha(returns, benchmarkReturns, periodsPerYear, 10);
}