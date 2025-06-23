import { buildServer } from '../src/http';

// Mock getFundReturns and metrics for deterministic testing
jest.mock('../src/services/fundFetcher', () => ({
  getFundReturns: jest.fn(async (ticker: string) => {
    return [
      { date: '2020-01-01', price: 100, return: null, index: 100 },
      { date: '2020-02-01', price: 110, return: 0.1, index: 110 },
      { date: '2020-03-01', price: 90, return: -0.1818, index: 90 },
    ];
  }),
}));

const serverPromise = buildServer();

describe('HTTP API', () => {
  it('GET /fund/:ticker returns series', async () => {
    const server = await serverPromise;
    const response = await server.inject({
      method: 'GET',
      url: '/fund/FAKE',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.ticker).toBe('FAKE');
    expect(body.series.length).toBeGreaterThan(0);
  });

  it('GET /fund/:ticker/metrics returns metrics', async () => {
    const server = await serverPromise;
    const response = await server.inject({
      method: 'GET',
      url: '/fund/FAKE/metrics',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.metrics).toHaveProperty('cagr');
    expect(body.metrics).toHaveProperty('maxDrawdown');
    expect(body.metrics).toHaveProperty('volatility');
    expect(body.metrics).toHaveProperty('sharpeRatio');
  });
});