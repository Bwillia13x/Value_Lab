import { cagr, maxDrawdown, volatility, sharpeRatio } from '../src/metrics';

describe('metrics utility', () => {
  describe('cagr', () => {
    it('calculates CAGR correctly', () => {
      const start = 100;
      const end = 121;
      const years = 2;
      const result = cagr(start, end, years);
      expect(result).toBeCloseTo(0.10, 5);
    });

    it('throws error for non-positive values', () => {
      expect(() => cagr(-100, 121, 2)).toThrow('Values must be positive');
      expect(() => cagr(100, -121, 2)).toThrow('Values must be positive');
    });

    it('throws error for non-positive periods', () => {
      expect(() => cagr(100, 121, 0)).toThrow('Periods must be > 0');
      expect(() => cagr(100, 121, -1)).toThrow('Periods must be > 0');
    });
  });

  describe('maxDrawdown', () => {
    it('computes maximum drawdown correctly', () => {
      const series = [100, 120, 110, 90, 95, 130];
      const dd = maxDrawdown(series);
      // peak at 120, trough 90 => 25% drawdown
      expect(dd).toBeCloseTo(0.25, 5);
    });

    it('throws error for empty series', () => {
      expect(() => maxDrawdown([])).toThrow('Series empty');
    });

    it('returns 0 for monotonically increasing series', () => {
      const series = [100, 110, 120, 130];
      const dd = maxDrawdown(series);
      expect(dd).toBe(0);
    });
  });

  describe('volatility', () => {
    it('calculates volatility correctly', () => {
      const returns = [0.01, 0.02, -0.01, 0.03, -0.02];
      const vol = volatility(returns, false); // Monthly volatility
      expect(vol).toBeGreaterThan(0);
    });

    it('annualizes volatility when requested', () => {
      const returns = [0.01, 0.02, -0.01, 0.03, -0.02];
      const monthlyVol = volatility(returns, false);
      const annualVol = volatility(returns, true);
      expect(annualVol).toBeCloseTo(monthlyVol * Math.sqrt(12), 5);
    });

    it('throws error for empty returns', () => {
      expect(() => volatility([])).toThrow('Returns array empty');
    });
  });

  describe('sharpeRatio', () => {
    it('calculates Sharpe ratio correctly', () => {
      const returns = [0.01, 0.02, -0.01, 0.03, -0.02];
      const riskFreeRate = 0.02; // 2% annual
      const sharpe = sharpeRatio(returns, riskFreeRate);
      expect(typeof sharpe).toBe('number');
      expect(sharpe).not.toBeNaN();
    });

    it('returns 0 when volatility is 0', () => {
      const returns = [0.01, 0.01, 0.01, 0.01, 0.01]; // Constant returns
      const sharpe = sharpeRatio(returns);
      expect(sharpe).toBe(0);
    });

    it('throws error for empty returns', () => {
      expect(() => sharpeRatio([])).toThrow('Returns array empty');
    });
  });
});