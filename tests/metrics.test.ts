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
  });

  describe('maxDrawdown', () => {
    it('computes maximum drawdown correctly', () => {
      const series = [100, 120, 110, 90, 95, 130];
      const dd = maxDrawdown(series);
      expect(dd).toBeCloseTo(0.25, 5);
    });
  });

  describe('volatility', () => {
    it('computes standard deviation', () => {
      const returns = [0.1, -0.05, 0.07, 0.02];
      const vol = volatility(returns);
      // manual std dev calculation ~0.0699
      expect(vol).toBeCloseTo(0.0656, 3);
    });
  });

  describe('sharpeRatio', () => {
    it('computes sharpe ratio', () => {
      const returns = [0.1, 0.2, -0.05, 0.15];
      const sr = sharpeRatio(returns, 0.02);
      expect(sr).toBeGreaterThan(0);
    });
  });
});