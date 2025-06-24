# Value Lab – Fund Performance Viewer

A production-ready web application that fetches and visualizes monthly fund performance data. Features interactive charts, performance metrics (CAGR, max drawdown), and a clean TypeScript implementation with caching and error handling.

## Features

- 📊 Interactive fund performance charts with Chart.js
- 📈 Key performance metrics calculation (CAGR, Max Drawdown)
- 🚀 Production-ready TypeScript/Node.js backend
- ⚡ Redis caching with 24h TTL
- 🗄️ Supabase data persistence for auditability
- 🐋 Docker containerization
- 🔒 Security headers and input validation
- 🩺 Health check endpoints with monitoring
- ✅ Comprehensive test coverage

## Quick Start

### Development

```bash
# 1. Install dependencies
npm ci

# 2. Start Redis (optional - uses in-memory cache if not available)
docker compose up -d redis

# 3. Set up environment
cp .env.example .env
# Edit .env with your Supabase credentials (optional for development)

# 4. Run tests
npm test

# 5. Start development server
npm run dev
# Visit http://localhost:3000
```

### Production Deployment

```bash
# Build and start
npm run build:prod
npm start

# Or using Docker
docker build -t value-lab .
docker run -p 3000:3000 --env-file .env value-lab
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | No | `https://dummy.supabase.test` | Supabase project URL |
| `SUPABASE_ANON_KEY` | No | `dummy` | Supabase anonymous key |
| `REDIS_URL` | No | `mock` | Redis connection URL (use "mock" for in-memory) |
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | Environment mode |

## API Endpoints

- `GET /health` - Health check with system information
- `GET /fund/:ticker` - Fetch fund performance data for given ticker
- `GET /` - Serve the web interface

## Project Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm run build:prod` | Lint + build for production |
| `npm start` | Start production server |
| `npm test` | Run all tests with coverage |
| `npm run lint` | Run ESLint |

## Architecture

- **Frontend**: Vanilla HTML/JS with Chart.js for visualization
- **Backend**: Express.js with TypeScript
- **Cache**: Redis with in-memory fallback
- **Database**: Supabase for data persistence
- **External API**: Yahoo Finance for market data

## Production Features

- Type-safe error handling and logging
- Request validation and sanitization
- Security headers (X-Frame-Options, X-XSS-Protection, etc.)
- Comprehensive health checks
- Docker containerization with non-root user
- ESLint configuration with strict TypeScript rules
- Jest test suite with integration tests