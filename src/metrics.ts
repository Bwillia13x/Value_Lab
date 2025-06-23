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