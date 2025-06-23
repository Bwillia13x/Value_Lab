/* eslint-disable jest/expect-expect */
import { jest } from '@jest/globals';

// Prepare env vars BEFORE importing service
process.env.SUPABASE_URL = 'https://dummy.supabase.test';
process.env.SUPABASE_ANON_KEY = 'dummy-key';
process.env.REDIS_URL = 'redis://localhost:6379';

// ----- Jest mocks -----
// Mock Supabase client with no-op methods
jest.mock('@supabase/supabase-js', () => {
  const noOp = () => ({
    select: () => ({
      eq: () => ({
        gte: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    }),
    insert: () => Promise.resolve({ error: null }),
  });
  return {
    createClient: jest.fn(() => ({
      from: noOp,
    })),
  };
});

// In-memory Redis stub
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    const store = new Map<string, { value: string; exp?: number }>();

    return {
      get: jest.fn(async (key: string) => {
        const entry = store.get(key);
        if (!entry) return null;
        if (entry.exp && entry.exp < Date.now()) {
          store.delete(key);
          return null;
        }
        return entry.value;
      }),
      set: jest.fn(async (
        key: string,
        value: string,
        mode?: string,
        duration?: number,
      ) => {
        if (mode === 'EX' && duration) {
          store.set(key, { value, exp: Date.now() + duration * 1000 });
        } else {
          store.set(key, { value });
        }
        return 'OK';
      }),
    };
  });
});

import { getFundReturns } from '../src/services/fundFetcher';

// Increase default timeout for first network call
jest.setTimeout(30000);

describe('fundFetcher – integration', () => {
  const tickers = ['BRK-A', 'SPY'];

  it('fetches and caches series – cache hit <2 s', async () => {
    for (const ticker of tickers) {
      // 1st call – warm cache
      await getFundReturns(ticker);

      // 2nd call should be from cache and fast
      const t0 = Date.now();
      const second = await getFundReturns(ticker);
      const ms = Date.now() - t0;

      // basic sanity: we received data
      expect(second.length).toBeGreaterThan(5);

      // performance requirement
      expect(ms).toBeLessThan(2000);
    }
  });
});