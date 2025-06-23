import fetch from 'node-fetch';
import Redis from 'ioredis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types
export interface MonthlyReturn {
  /** ISO string (YYYY-MM-DD) marking the month-end date */
  date: string;
  /** Adjusted close price for the month-end */
  price: number;
  /** Fractional monthly return (null for first data-point) */
  return: number | null;
  /** Index series rebased so first point = 100 */
  index: number;
}

// Environment variables (throw early if missing to surface mis-configuration)
const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  REDIS_URL,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('FundFetcher: missing SUPABASE_URL or SUPABASE_ANON_KEY env vars');
}
if (!REDIS_URL) {
  throw new Error('FundFetcher: missing REDIS_URL env var');
}

// Clients – initialise once and reuse
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const redis = new Redis(REDIS_URL, {
  // best-practice: auto-reconnect & sensible timeouts
  maxRetriesPerRequest: null,
});

// ------------------------
// Utility: fetch with retry & exponential back-off
// ------------------------
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3,
  backoffMs = 500,
): Promise<any> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} – ${res.statusText}`);
      }
      return res.json();
    } catch (err) {
      attempt += 1;
      if (attempt > retries) {
        throw err;
      }
      const waitTime = backoffMs * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}

// ------------------------
// Yahoo Finance helper
// ------------------------
async function fetchFundPricesFromYahoo(ticker: string): Promise<any> {
  const nowSec = Math.floor(Date.now() / 1000);
  const earliestSec = 0; // unix epoch – Yahoo will clamp internally
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker,
  )}?period1=${earliestSec}&period2=${nowSec}&interval=1mo&includeAdjustedClose=true`;

  return fetchWithRetry(url);
}

// ------------------------
// Transform raw Yahoo JSON into MonthlyReturn[]
// ------------------------
function parseMonthlyReturns(raw: any): MonthlyReturn[] {
  if (!raw || !raw.chart || !raw.chart.result || !raw.chart.result.length) {
    throw new Error('Unexpected Yahoo response shape');
  }

  const result = raw.chart.result[0];
  const ts: number[] = result.timestamp || [];
  const prices: (number | null)[] =
    result.indicators?.adjclose?.[0]?.adjclose || [];

  if (!ts.length || !prices.length) {
    throw new Error('No price data returned');
  }

  const paired = ts
    .map((t, i) => ({ t, p: prices[i] }))
    .filter((d) => d.p != null);

  if (!paired.length) {
    throw new Error('Price series empty after filtering nulls');
  }

  const basePrice = paired[0].p as number;

  const monthly: MonthlyReturn[] = paired.map((d, idx) => {
    const price = d.p as number;
    const ret = idx === 0 ? null : price / (paired[idx - 1].p as number) - 1;
    const index = (price / basePrice) * 100;

    const date = new Date(d.t * 1000); // convert to ms
    // normalise to YYYY-MM-01 for clarity but keep month-end semantics
    const isoDate = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
    )
      .toISOString()
      .substring(0, 10);

    return {
      date: isoDate,
      price,
      return: ret,
      index,
    };
  });

  return monthly;
}

// ------------------------
// Persistence layer – Supabase JSON storage
// ------------------------
async function persistRawJson(
  ticker: string,
  raw: any,
  fetchedAt: string,
): Promise<void> {
  const { error } = await supabase.from('fund_prices').insert([
    {
      ticker,
      fetched_at: fetchedAt,
      raw_json: raw,
    },
  ]);
  if (error) {
    // we log but do NOT throw – downstream flow should succeed even if persistence fails
    // eslint-disable-next-line no-console
    console.warn('Supabase insert error', error);
  }
}

// ------------------------
// Main public helper
// ------------------------
/**
 * Fetches monthly total-return series for a fund, caching on Redis (24 h).
 * Normalises series to index = 100 on the first available month.
 */
export async function getFundReturns(
  ticker: string,
): Promise<MonthlyReturn[]> {
  const cacheKey = `fund:${ticker}:returns`;

  // 1. Try Redis cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const fetchedAt = new Date().toISOString();

  // 2. Attempt to reuse the most-recent snapshot from Supabase (if <24 h old)
  const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existingData } = await supabase
    .from('fund_prices')
    .select('raw_json, fetched_at')
    .eq('ticker', ticker)
    .gte('fetched_at', yesterdayIso)
    .order('fetched_at', { ascending: false })
    .limit(1);

  let rawJson: any;
  if (existingData && existingData.length) {
    rawJson = existingData[0].raw_json;
  } else {
    // 3. Hit Yahoo Finance API
    rawJson = await fetchFundPricesFromYahoo(ticker);
    // Persist asynchronously – no await to keep latency low
    persistRawJson(ticker, rawJson, fetchedAt).catch(() => void 0);
  }

  // 4. Transform
  const series = parseMonthlyReturns(rawJson);

  // 5. Set Redis cache (24 h TTL)
  await redis.set(cacheKey, JSON.stringify(series), 'EX', 60 * 60 * 24);

  return series;
}