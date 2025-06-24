import express, { Request, Response } from 'express';
import { getFundReturns } from './services/fundFetcher';
import path from 'path';

interface ErrorWithMessage {
  message: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;
  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    return new Error(String(maybeError));
  }
}

function getErrorMessage(error: unknown) {
  return toErrorWithMessage(error).message;
}

const app = express();
const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV || 'development';

// Security middleware for production
if (nodeEnv === 'production') {
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Basic security headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}

// serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (_req: Request, res: Response) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: nodeEnv,
    version: process.env.npm_package_version || '1.0.0'
  };
  res.json(healthCheck);
});

app.get('/fund/:ticker', async (req: Request, res: Response) => {
  try {
    const ticker = req.params.ticker;
    
    if (!ticker || typeof ticker !== 'string') {
      res.status(400).json({ error: 'Invalid ticker parameter' });
      return;
    }
    
    console.log(`Fetching data for ticker: ${ticker}`);
    const data = await getFundReturns(ticker);
    console.log(`Successfully fetched ${data.length} data points for ${ticker}`);
    res.json(data);
  } catch (err: unknown) {
    const errorMessage = getErrorMessage(err);
    console.error(`Error fetching data for ticker ${req.params.ticker}:`, errorMessage);
    res.status(500).json({ error: errorMessage });
  }
});

app.listen(port, () => {
  console.log(`Value Lab server listening on http://localhost:${port}`);
}); 