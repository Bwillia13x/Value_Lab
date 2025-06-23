import {
  calculateCagr,
  maxDrawdown,
  hitRatio,
  sortinoRatio,
  informationRatio,
  rollingAlpha3Y,
  rollingAlpha5Y,
  rollingAlpha10Y,
} from '../src/utils/performance';

const MONTHS_PER_YEAR = 12;

describe('Performance metric engine', () => {
  describe('CAGR', () => {
    it('matches Excel-calculated CAGR within 1 bp', () => {
      const prices: number[] = [];
      // 1 % monthly growth over 24 months (2 years)
      let price = 100;
      for (let i = 0; i < 24; i++) {
        prices.push(price);
        price *= 1.01;
      }
      prices.push(price); // final price

      const expected = Math.pow(1.01, 12) - 1; // Excel value
      expect(calculateCagr(prices, MONTHS_PER_YEAR)).toBeCloseTo(expected, 4);
    });

    it('returns 0 when series is flat', () => {
      const prices = new Array(10).fill(100);
      expect(calculateCagr(prices, MONTHS_PER_YEAR)).toBe(0);
    });
  });

  describe('Maximum drawdown', () => {
    it('detects the worst drawdown', () => {
      const prices = [100, 120, 115, 90, 80, 95, 70, 110];
      // Worst drop: 120 → 70 = -41.6666 %
      expect(maxDrawdown(prices)).toBeCloseTo(-0.41666, 4);
    });

    it('is 0 for monotonically increasing series', () => {
      const prices = [1, 2, 3, 4, 5];
      expect(maxDrawdown(prices)).toBe(0);
    });

    it('maxDrawdown handles zero prices gracefully', () => {
      const prices = [0, 0, 10, 0, 5];
      // Worst drop is from 10 → 0 = -100 %
      expect(maxDrawdown(prices)).toBe(-1);
    });
  });

  describe('Hit ratio', () => {
    it('computes positive-return hit ratio', () => {
      const returns = [0.1, -0.05, 0.02, 0, 0.03];
      expect(hitRatio(returns)).toBeCloseTo(3 / 5, 5);
    });

    it('computes outperformance hit ratio vs benchmark', () => {
      const asset = [0.02, 0.01, -0.01, 0.04];
      const bench = [0.01, 0.02, -0.03, 0.05];
      // Periods: beats on 1st and 3rd = 2/4
      expect(hitRatio(asset, bench)).toBeCloseTo(0.5, 5);
    });

    it('hitRatio returns 0 for empty returns array', () => {
      expect(hitRatio([])).toBe(0);
    });
  });

  describe('Sortino ratio', () => {
    it('matches Excel-calculated Sortino ratio within 1 bp', () => {
      const returns = [0.02, 0.01, -0.01, 0.04, -0.02, 0.03];
      // Excel value pre-computed
      const expected = 2.5560386017;
      expect(sortinoRatio(returns, MONTHS_PER_YEAR)).toBeCloseTo(expected, 4);
    });

    it('is 0 when downside deviation is 0', () => {
      const returns = new Array(12).fill(0.01);
      expect(sortinoRatio(returns, MONTHS_PER_YEAR)).toBe(0);
    });

    it('sortinoRatio returns 0 for invalid periodsPerYear', () => {
      const returns = [0.01, 0.02, -0.01];
      expect(sortinoRatio(returns, 0)).toBe(0);
    });
  });

  describe('Information ratio', () => {
    it('matches Excel-calculated information ratio within 1 bp', () => {
      const asset = [0.015, 0.02, -0.005, 0.03, 0.01];
      const bench = [0.01, 0.01, 0, 0.02, 0.008];
      const expected = 2.4313474416;
      expect(informationRatio(asset, bench, MONTHS_PER_YEAR)).toBeCloseTo(expected, 4);
    });

    it('is 0 when tracking error is 0', () => {
      const asset = [0.01, 0.02];
      expect(informationRatio(asset, asset, MONTHS_PER_YEAR)).toBe(0);
    });

    it('informationRatio returns 0 when only one active return value', () => {
      const asset = [0.015];
      const bench = [0.01];
      expect(informationRatio(asset, bench, MONTHS_PER_YEAR)).toBe(0);
    });
  });

  describe('Rolling alpha', () => {
    const years = 10;
    const months = years * MONTHS_PER_YEAR;
    // Asset: 1.2 % monthly, benchmark: 1 % monthly
    const assetRet = new Array(months).fill(0.012);
    const benchRet = new Array(months).fill(0.01);

    it('computes 3-year rolling alpha length', () => {
      const alpha3 = rollingAlpha3Y(assetRet, benchRet, MONTHS_PER_YEAR);
      expect(alpha3.length).toBe(months - 3 * MONTHS_PER_YEAR + 1);
      // Each window should have positive alpha ~ (1.012^{12} - 1) - (1.01^{12} - 1)
      const expected = Math.pow(1.012, 12) - 1 - (Math.pow(1.01, 12) - 1);
      expect(alpha3[0]).toBeCloseTo(expected, 4);
    });

    it('handles insufficient data by returning empty array', () => {
      const short = [0.01, 0.02];
      expect(rollingAlpha5Y(short, short, MONTHS_PER_YEAR)).toEqual([]);
    });

    it('computes 10-year rolling alpha resulting in single value', () => {
      const alpha10 = rollingAlpha10Y(assetRet, benchRet, MONTHS_PER_YEAR);
      expect(alpha10.length).toBe(1);
      const expected = Math.pow(1.012, 120) ** (1 / 10) - 1 - (Math.pow(1.01, 120) ** (1 / 10) - 1);
      // expected should match asset CAGR - benchmark CAGR across the full span
      expect(alpha10[0]).toBeCloseTo(expected, 4);
    });

    it('rollingAlpha returns empty array for bad params', () => {
      expect(rollingAlpha3Y([], [], MONTHS_PER_YEAR)).toEqual([]);
      const asset = [0.01, 0.02];
      const bench = [0.01, 0.02, 0.03];
      expect(rollingAlpha5Y(asset, bench, MONTHS_PER_YEAR)).toEqual([]);
    });
  });

  describe('Edge cases & validation', () => {
    it('calculateCagr returns 0 for invalid data', () => {
      expect(calculateCagr([100], MONTHS_PER_YEAR)).toBe(0); // too short
      expect(calculateCagr([-100, 50], MONTHS_PER_YEAR)).toBe(0); // negative start
      expect(calculateCagr([100, 0], MONTHS_PER_YEAR)).toBe(0); // zero end
      expect(calculateCagr([100, 105], 0)).toBe(0); // invalid periodsPerYear
    });

    it('maxDrawdown returns 0 for empty array', () => {
      expect(maxDrawdown([])).toBe(0);
    });

    it('hitRatio throws on length mismatch', () => {
      const a = [0.01, 0.02];
      const b = [0.01];
      expect(() => hitRatio(a, b)).toThrow();
    });

    it('informationRatio returns 0 with invalid inputs', () => {
      expect(informationRatio([], [], MONTHS_PER_YEAR)).toBe(0);
      expect(informationRatio([0.01], [0.01, 0.02], MONTHS_PER_YEAR)).toBe(0);
      expect(informationRatio([0.01], [0.01], 0)).toBe(0);
    });

    it('rollingAlpha returns empty array for bad params', () => {
      expect(rollingAlpha3Y([], [], MONTHS_PER_YEAR)).toEqual([]);
      const asset = [0.01, 0.02];
      const bench = [0.01, 0.02, 0.03];
      expect(rollingAlpha5Y(asset, bench, MONTHS_PER_YEAR)).toEqual([]);
    });
  });
});