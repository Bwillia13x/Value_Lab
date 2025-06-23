import Redis from 'ioredis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface MonthlyReturn {
  date: string; // YYYY-MM-DD (month-start)
  price: number; // adj. close
  return: number | null; // month-on-month % (null for first datum)
  index: number; // rebased so first point = 100
}

const { SUPABASE_URL, SUPABASE_ANON_KEY, REDIS_URL } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_URL / SUPABASE_ANON_KEY');
}
if (!REDIS_URL) {
  throw new Error('Missing REDIS_URL');
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

async function fetchWithRetry(url: string, retries = 3, backoff = 500): Promise<any> {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url);
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
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=0&period2=${now}&interval=1mo&includeAdjustedClose=true`;
  return fetchWithRetry(url);
}

function toMonthly(raw: any): MonthlyReturn[] {
  const result = raw?.chart?.result?.[0];
  const timestamps: number[] = result?.timestamp ?? [];
  const prices: (number | null)[] = result?.indicators?.adjclose?.[0]?.adjclose ?? [];
  const rows = timestamps.map((t, i) => ({ t, p: prices[i] })).filter(r => r.p != null) as { t: number; p: number }[];
  if (!rows.length) throw new Error('No price data');
  const base = rows[0].p;
  return rows.map((row, idx) => {
    const dt = new Date(row.t * 1000);
    const date = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), 1)).toISOString().slice(0, 10);
    return {
      date,
      price: row.p,
      return: idx ? row.p / rows[idx - 1].p - 1 : null,
      index: (row.p / base) * 100,
    };
  });
}

async function persistRaw(ticker: string, raw: any, fetchedAt: string) {
  try {
    await supabase.from('fund_prices').insert([{ ticker, raw_json: raw, fetched_at: fetchedAt }]);
  } catch (err) {
    console.warn('Supabase insert failed', err);
  }
}

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
  if (!data?.length) persistRaw(ticker, raw, fetchedAt);

  const series = toMonthly(raw);
  await redis.set(cacheKey, JSON.stringify(series), 'EX', 86400);
  return series;
}