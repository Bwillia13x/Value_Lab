export function cagr(startValue: number, endValue: number, periods: number): number {
  if (startValue <= 0 || endValue <= 0) {
    throw new Error('Values must be positive');
  }
  if (periods <= 0) {
    throw new Error('Periods must be > 0');
  }
  return Math.pow(endValue / startValue, 1 / periods) - 1;
}

export function maxDrawdown(values: number[]): number {
  if (!values.length) throw new Error('Series empty');
  let peak = values[0];
  let maxDD = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak; // 0..1
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD; // expressed as positive decimal e.g. 0.28 => -28%
}

export function volatility(returns: number[], annualize = true): number {
  if (!returns.length) throw new Error('Returns array empty');
  
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);
  
  return annualize ? stdDev * Math.sqrt(12) : stdDev; // Assuming monthly returns
}

export function sharpeRatio(returns: number[], riskFreeRate = 0): number {
  if (!returns.length) throw new Error('Returns array empty');
  
  const excessReturns = returns.map(r => r - riskFreeRate / 12); // Adjust risk-free rate to monthly
  const meanExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
  const vol = volatility(excessReturns, false); // Use monthly volatility for Sharpe calculation
  
  if (vol === 0) return 0;
  return meanExcessReturn / vol * Math.sqrt(12); // Annualize Sharpe ratio
}