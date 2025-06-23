import fetch from 'node-fetch';
import Redis from 'ioredis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface MonthlyReturn {
  date: string; // YYYY-MM-DD (month-start)
  price: number; // adj. close
  return: number | null; // month-on-month % (null for 1st obs)
  index: number; // rebased so series[0] === 100
}

// --- env checks --------------------------------------------------------------
const { SUPABASE_URL, SUPABASE_ANON_KEY, REDIS_URL } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_URL / SUPABASE_ANON_KEY');
}
if (!REDIS_URL) {
  throw new Error('Missing REDIS_URL');
}

// --- clients -----------------------------------------------------------------
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

// --- helpers -----------------------------------------------------------------
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3,
  backoff = 500,
): Promise<any> {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, options as any);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (e) {
      if (i >= retries) throw e;
      await new Promise(r => setTimeout(r, backoff * 2 ** i));
    }
  }
}

async function yahooChart(ticker: string) {
  const now = Math.floor(Date.now() / 1000);
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      ticker,
    )}?period1=0&period2=${now}&interval=1mo&includeAdjustedClose=true`;
  return fetchWithRetry(url);
}

function toMonthly(raw: any): MonthlyReturn[] {
  const result = raw?.chart?.result?.[0];
  const ts: number[] = result?.timestamp ?? [];
  const prices: (number | null)[] =
    result?.indicators?.adjclose?.[0]?.adjclose ?? [];
  const series = ts
    .map((t, i) => ({ t, p: prices[i] }))
    .filter(d => d.p != null) as { t: number; p: number }[];

  const base = series[0].p;
  return series.map((d, i) => {
    const date = new Date(
      Date.UTC(
        new Date(d.t * 1000).getUTCFullYear(),
        new Date(d.t * 1000).getUTCMonth(),
        1,
      ),
    )
      .toISOString()
      .slice(0, 10);
    return {
      date,
      price: d.p,
      return: i ? d.p / series[i - 1].p - 1 : null,
      index: (d.p / base) * 100,
    };
  });
}

async function persistRaw(ticker: string, raw: any, fetchedAt: string) {
  await supabase
    .from('fund_prices')
    .insert([{ ticker, raw_json: raw, fetched_at: fetchedAt }]);
}

// --- public API --------------------------------------------------------------
export async function getFundReturns(ticker: string): Promise<MonthlyReturn[]> {
  const cacheKey = `fund:${ticker}:returns`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const fetchedAt = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString();

  const { data } = await supabase
    .from('fund_prices')
    .select('raw_json')
    .eq('ticker', ticker)
    .gte('fetched_at', yesterday)
    .order('fetched_at', { ascending: false })
    .limit(1);

  const raw = data?.[0]?.raw_json ?? (await yahooChart(ticker));
  if (!data?.length) persistRaw(ticker, raw, fetchedAt).catch(() => {});

  const series = toMonthly(raw);
  await redis.set(cacheKey, JSON.stringify(series), 'EX', 86400);
  return series;
}