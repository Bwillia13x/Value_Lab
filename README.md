# Value-Lab – Value-Investor Performance Laboratory

[![CI](https://github.com/your-org/value-investor-performance-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/value-investor-performance-lab/actions/workflows/ci.yml)

A TypeScript back-end service that retrieves monthly total-return series for marquee value-investor funds (via Yahoo Finance), caches them in Redis, archives raw JSON to Supabase, and computes core performance metrics (CAGR, maximum draw-down, volatility and Sharpe ratio). It ships with a Node CLI, a minimal HTTP API and full Jest test-harness.

> **Project vision** – Lay the quantitative foundation for the Pixel Wisdom "Value-Lab". Future iterations will layer on React data-visualisations and scenario-simulation engines.

---

## Quick start

```bash
# 1. Install
pnpm install # or npm ci / yarn install

# 2. Configure environment
cp .env.example .env
# ➜ populate with your Supabase + Redis credentials

# 3. Build & test
npm run lint   # ESLint (zero warnings)
npm test       # Jest unit + integration tests
npm run build  # TypeScript compile (dist/)

# 4. Fetch metrics from CLI
node dist/cli.js BRK-A

# 5. Run HTTP server
node dist/http.js --port 8080 &
# ➜ GET http://localhost:8080/fund/BRK-A/metrics
```

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon service key |
| `REDIS_URL` | Redis connection string |

Create a local `.env` (or supply via Docker secrets / Vercel env) – see `.env.example`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run lint` | ESLint with strict TypeScript rules |
| `npm test` | Jest unit + integration tests |
| `npm run build` | TypeScript compile to `dist/` (ES2022) |
| `npm start` | Execute CLI (`node dist/cli.js`) |
| `npm run serve` | Start HTTP API (`node dist/http.js --port 8080`) |

---

## Architecture diagram

```text
┌─────────┐      fetch (Yahoo)      ┌────────────┐
│ fundFetcher.ts ├───────────────▶ │  Yahoo API │
└─────────┘                       └────────────┘
     │   ▲
     ▼   │   cache (24h)            audit raw JSON
  Redis  │                       Supabase table (fund_prices)
     │   ▼
┌─────────────────────────────────────────────────────┐
│             Metrics engine (metrics.ts)             │
│  CAGR │ MaxDD │ Volatility │ Sharpe                │
└─────────────────────────────────────────────────────┘
     │                                   ▲
     │ CLI / HTTP interface              │
     ▼                                   │
User requests                    Supabase for lineage
```

---

## Running tests

The integration test mocks Supabase and Redis so **no external network calls** are performed. Only the first Yahoo request per run hits the real API and is cached in-memory thereafter.

```bash
npm test
```

Coverage must stay **≥ 90 %** for public functions.

---

## Building for production

```bash
npm ci
npm run build
```

Outputs go to `dist/` and are entirely ESM-ready.

---

## Docker

Multi-stage image (node 20-slim) builds the code then runs the HTTP server:

```Dockerfile
# syntax=docker/dockerfile:1
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . ./
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "dist/http.js", "--port", "8080"]
```

Build & run:

```bash
docker build -t value-lab .
docker run -p 8080:8080 --env-file .env value-lab
```

---

## Roadmap

1. **Metrics expansion** – alpha vs S&P 500, Sortino, drawdown duration.
2. **Scenario simulator** – Monte Carlo + fundamental driver modes.
3. **React UI** – Interactive charts with dark/light theme.
4. **CI deploy** – Vercel preview → prod pipeline.

Contributions welcome – please open an issue or PR following the Conventional Commits style.