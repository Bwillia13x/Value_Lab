import { cagr, maxDrawdown } from '../src/metrics';

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
      // peak at 120, trough 90 => 25% drawdown
      expect(dd).toBeCloseTo(0.25, 5);
    });
  });
});