"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFundReturns = getFundReturns;
require("dotenv/config");
const ioredis_1 = __importDefault(require("ioredis"));
const supabase_js_1 = require("@supabase/supabase-js");
// --- env checks --------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dummy.supabase.test';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'dummy';
const REDIS_URL = process.env.REDIS_URL || 'mock';
// --- clients -----------------------------------------------------------------
const supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY);
// In-memory fallback if Redis not available (REDIS_URL="mock")
class InMemoryRedis {
    constructor() {
        this.store = new Map();
    }
    async get(k) {
        const e = this.store.get(k);
        if (!e)
            return null;
        if (e.exp && e.exp < Date.now()) {
            this.store.delete(k);
            return null;
        }
        return e.v;
    }
    async set(k, v, mode, ttl) {
        this.store.set(k, {
            v,
            exp: mode === 'EX' && ttl ? Date.now() + ttl * 1000 : undefined,
        });
        return 'OK';
    }
}
const redis = REDIS_URL === 'mock' ? new InMemoryRedis() : new ioredis_1.default(REDIS_URL, { maxRetriesPerRequest: null });
// --- helpers -----------------------------------------------------------------
async function fetchWithRetry(url, options = {}, retries = 3, backoff = 500) {
    for (let i = 0;; i++) {
        try {
            const res = await fetch(url, options);
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            return res.json();
        }
        catch (e) {
            if (i >= retries)
                throw e;
            await new Promise(r => setTimeout(r, backoff * 2 ** i));
        }
    }
}
async function yahooChart(ticker) {
    const now = Math.floor(Date.now() / 1000);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=0&period2=${now}&interval=1mo&includeAdjustedClose=true`;
    return fetchWithRetry(url);
}
function toMonthly(raw) {
    const typedRaw = raw;
    const result = typedRaw?.chart?.result?.[0];
    const ts = result?.timestamp ?? [];
    const prices = result?.indicators?.adjclose?.[0]?.adjclose ?? [];
    const series = ts
        .map((t, i) => ({ t, p: prices[i] }))
        .filter(d => d.p != null);
    const base = series[0].p;
    return series.map((d, i) => {
        const date = new Date(Date.UTC(new Date(d.t * 1000).getUTCFullYear(), new Date(d.t * 1000).getUTCMonth(), 1))
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
async function persistRaw(ticker, raw, fetchedAt) {
    await supabase
        .from('fund_prices')
        .insert([{ ticker, raw_json: raw, fetched_at: fetchedAt }]);
}
// --- public API --------------------------------------------------------------
async function getFundReturns(ticker) {
    const cacheKey = `fund:${ticker}:returns`;
    const cached = await redis.get(cacheKey);
    if (cached)
        return JSON.parse(cached);
    const fetchedAt = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const { data } = await supabase
        .from('fund_prices')
        .select('raw_json')
        .eq('ticker', ticker)
        .gte('fetched_at', yesterday)
        .order('fetched_at', { ascending: false })
        .limit(1);
    const raw = data?.[0]?.raw_json ?? (await yahooChart(ticker));
    if (!data?.length)
        persistRaw(ticker, raw, fetchedAt).catch(() => { });
    const series = toMonthly(raw);
    await redis.set(cacheKey, JSON.stringify(series), 'EX', 86400);
    return series;
}
