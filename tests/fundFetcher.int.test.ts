/* eslint-disable jest/expect-expect */
import { jest } from '@jest/globals';

// fake env
process.env.SUPABASE_URL = 'https://dummy.supabase.test';
process.env.SUPABASE_ANON_KEY = 'dummy';
process.env.REDIS_URL = 'redis://localhost:6379';

// mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: () => ({
            order: () => ({
              limit: () => Promise.resolve({ data: [] }),
            }),
          }),
        }),
      }),
      insert: () => Promise.resolve({}),
    }),
  })),
}));

// in-memory Redis
jest.mock('ioredis', () =>
  jest.fn().mockImplementation(() => {
    const store = new Map<string, { v: string; exp?: number }>();
    return {
      get: async (k: string) => {
        const e = store.get(k);
        if (!e) return null;
        if (e.exp && e.exp < Date.now()) {
          store.delete(k);
          return null;
        }
        return e.v;
      },
      set: async (k: string, v: string, mode?: string, ttl?: number) => {
        store.set(k, {
          v,
          exp: mode === 'EX' ? Date.now() + ttl! * 1000 : undefined,
        });
        return 'OK';
      },
    } as any;
  }),
);

import { getFundReturns } from '../src/services/fundFetcher';

jest.setTimeout(30000);

describe('fundFetcher integration', () => {
  const tickers = ['BRK-A', 'SPY'];
  it('fetches & caches in <2 s', async () => {
    for (const t of tickers) {
      await getFundReturns(t); // warm
      const t0 = Date.now();
      const s = await getFundReturns(t); // cached
      expect(s.length).toBeGreaterThan(5);
      expect(Date.now() - t0).toBeLessThan(2000);
    }
  });
});