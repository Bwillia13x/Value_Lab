[![CI](https://github.com/your-org/value-investor-performance-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/value-investor-performance-lab/actions/workflows/ci.yml)

## Project Vision
Value Lab aims to provide a lightweight but robust back-end that fetches historical price data for marquee value-investor funds and computes core performance metrics that can be consumed from a CLI or HTTP API.

## Quick-start
```bash
# install deps
npm ci
# set up environment (fill in with your own keys)
cp .env.example .env
# run tests
npm test
# build production bundle
npm run build
# run HTTP server
node dist/http.js --port 8080
```

## Environment variables
| Name | Description |
|------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `REDIS_URL` | Redis connection string |

## Running tests
```
npm test        # unit + integration
```

## Building for prod
```
npm run build   # outputs JS to dist/
```

## Roadmap
See [value lab.md](value%20lab.md) for the big-picture roadmap. MVP 1 focuses on the data layer, metrics and minimal HTTP surface.

## Contributing
PRs welcome! Please ensure `npm run lint && npm test` pass before opening a pull-request.