import express from 'express';
import { getFundReturns } from './services/fundFetcher';

const app = express();
const port = process.env.PORT || 3000;

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/fund/:ticker', async (req, res) => {
  try {
    const ticker = req.params.ticker;
    const data = await getFundReturns(ticker);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'unknown error' });
  }
});

app.listen(port, () => {
  console.log(`Value Lab server listening on http://localhost:${port}`);
}); 