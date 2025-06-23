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
    const dd = (peak - v) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

export function volatility(returns: number[], window?: number): number {
  if (!returns.length) throw new Error('Series empty');
  const slice = window ? returns.slice(-window) : returns;
  const mean = slice.reduce((acc, r) => acc + r, 0) / slice.length;
  const variance = slice.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / (slice.length - 1);
  return Math.sqrt(variance);
}

export function sharpeRatio(returns: number[], rf = 0): number {
  if (!returns.length) throw new Error('Series empty');
  const excess = returns.map(r => r - rf);
  return (excess.reduce((acc, r) => acc + r, 0) / excess.length) / volatility(excess);
}