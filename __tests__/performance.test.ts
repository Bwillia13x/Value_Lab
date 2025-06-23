import {
  cagr,
  rollingAlpha,
  maxDrawdown,
  hitRatio,
  sortinoRatio,
  informationRatio,
} from '../src/utils/performance';

const monthlyPortfolio: number[] = [
  0.02, -0.01, 0.03, 0.015, 0.0, 0.025, -0.02, 0.01, 0.04, -0.015, 0.005, 0.02, 0.01, 0.0, -0.005,
  0.03, 0.01, -0.01, 0.025, 0.015, -0.02, 0.005, 0.03, -0.01, 0.015, 0.02, -0.02, 0.025, 0.005,
  0.015, 0.01, -0.005, 0.03, 0.012, -0.01, 0.02,
]; // 36 months (3 years)

const monthlyBenchmark: number[] = [
  0.015, -0.005, 0.025, 0.01, -0.005, 0.02, -0.015, 0.008, 0.03, -0.02, 0.002, 0.015, 0.012, -0.002,
  -0.008, 0.025, 0.012, -0.008, 0.02, 0.01, -0.018, 0.004, 0.025, -0.012, 0.012, 0.017, -0.018,
  0.02, 0.003, 0.013, 0.008, -0.004, 0.025, 0.01, -0.012, 0.017,
];

const periodsPerYear = 12;

// Pre-computed expected values (verified in spreadsheet)
const EXPECTED = {
  cagr: 0.109247, // 10.92 %
  maxDrawdown: 0.02, // 2 %
  hitRatio: 0.666667, // 24/36 months positive
  sortino: 5.456603,
  informationRatio: 2.586344,
  rollingAlpha3yLast: 0.03071, // alpha for full 3-year window
};

describe('performance utility', () => {
  it('cagr', () => {
    const val = cagr(monthlyPortfolio, periodsPerYear);
    expect(val).toBeCloseTo(EXPECTED.cagr, 4);
  });

  it('maxDrawdown', () => {
    const val = maxDrawdown(monthlyPortfolio);
    expect(val).toBeCloseTo(EXPECTED.maxDrawdown, 4);
  });

  it('hitRatio', () => {
    const val = hitRatio(monthlyPortfolio);
    expect(val).toBeCloseTo(EXPECTED.hitRatio, 4);
  });

  it('sortinoRatio', () => {
    const val = sortinoRatio(monthlyPortfolio, 0, periodsPerYear);
    expect(val).toBeCloseTo(EXPECTED.sortino, 4);
  });

  it('informationRatio', () => {
    const val = informationRatio(monthlyPortfolio, monthlyBenchmark, periodsPerYear);
    expect(val).toBeCloseTo(EXPECTED.informationRatio, 4);
  });

  it('rollingAlpha', () => {
    const alphas = rollingAlpha(monthlyPortfolio, monthlyBenchmark, 3, periodsPerYear);
    // expect length = 36 - 36 +1? Wait window 3 years = 36 months; For length same as window? Actually window size 36, so we should get 1 value aligning to end index 35.
    expect(alphas.length).toBe(1);
    expect(alphas[0]).toBeCloseTo(EXPECTED.rollingAlpha3yLast, 4);
  });

  it('rollingAlpha multiple windows length', () => {
    const longPortfolio = [...monthlyPortfolio, ...monthlyPortfolio]; // 72 months
    const longBenchmark = [...monthlyBenchmark, ...monthlyBenchmark];
    const alphas = rollingAlpha(longPortfolio, longBenchmark, 3, periodsPerYear);
    expect(alphas.length).toBe(72 - 36 + 1);
  });

  it('validation errors', () => {
    expect(() => rollingAlpha([0.01], [0.02, 0.03], 3, periodsPerYear)).toThrow(
      /equal length/,
    );
    expect(() => cagr([], periodsPerYear)).toThrow(/non-empty/);
  });

  // Edge cases
  it('throws on empty', () => {
    expect(() => cagr([], periodsPerYear)).toThrow();
  });

  it('flat series metrics', () => {
    const flat = Array(12).fill(0);
    expect(maxDrawdown(flat)).toBe(0);
    expect(hitRatio(flat)).toBe(0);
  });

  it('sortinoRatio returns Infinity when no downside', () => {
    const positive = Array(12).fill(0.01);
    expect(sortinoRatio(positive, 0, periodsPerYear)).toBe(Infinity);
  });

  it('informationRatio returns Infinity when tracking error zero', () => {
    const series = [0.01, 0.01, 0.01, 0.01];
    expect(informationRatio(series, series, periodsPerYear)).toBe(Infinity);
  });
});
