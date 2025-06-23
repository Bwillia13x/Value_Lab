# Value Lab – Fund Fetcher MVP

A minimal backend service that fetches monthly adjusted-close prices for a given ticker from Yahoo Finance, converts them to a rebased total-return series, caches the result in Redis for 24 h and stores the raw JSON in Supabase for auditability.

## Quick start (local)

```bash
# 1. Clone & install deps
npm ci

# 2. Start Redis (detached)
docker compose up -d redis   # requires Docker Desktop

# 3. Provide environment variables
cp .env.example .env
# → edit .env with your Supabase project keys (or leave blank for tests)

# 4. Run tests
npm test
```

## Required environment variables

| Name                | Example value                     | Notes                           |
| ------------------- | --------------------------------- | --------------------------------|
| `SUPABASE_URL`      | `https://xyzcompany.supabase.co`  | Supabase project REST endpoint  |
| `SUPABASE_ANON_KEY` | `eyJhbGci...`                     | Public anon key                 |
| `REDIS_URL`         | `redis://localhost:6379`          | Should match docker-compose port|

Tests inject dummy values at runtime, so you can run `npm test` without a real Supabase account.

## Project scripts

| Script            | Description                             |
| ----------------- | --------------------------------------- |
| `npm test`        | Run Jest unit + integration tests       |
| `npm run lint`    | ESLint (currently basic ruleset)        |
| `npm run build`   | Type-check the codebase (`tsc --noEmit`)|

## Roadmap (next)

* GitHub Actions CI (`npm ci → lint → test → build`).
* Metric helpers (CAGR, drawdown) with unit tests.
* Simple HTTP endpoint to expose `getFundReturns`. 