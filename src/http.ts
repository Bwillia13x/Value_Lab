import Fastify, { FastifyInstance, FastifyReply } from 'fastify';
import { getFundReturns } from './services/fundFetcher';
import { cagr, maxDrawdown, volatility, sharpeRatio } from './metrics';

export function buildServer() {
  const app: FastifyInstance = Fastify({ logger: true });

  app.get('/fund/:ticker', async (req: any, res: FastifyReply) => {
    const { ticker } = req.params;
    const data = await getFundReturns(ticker);
    return data;
  });

  app.get('/fund/:ticker/metrics', async (req: any, res: FastifyReply) => {
    const { ticker } = req.params;
    const series = await getFundReturns(ticker);
    const prices = series.map(s => s.price);
    const returns = series.slice(1).map((s, i) => s.price / series[i].price - 1);
    const years = series.length / 12;
    const metrics = {
      cagr: cagr(prices[0], prices[prices.length - 1], years),
      maxDrawdown: maxDrawdown(series.map(d => d.index)),
      volatility: volatility(returns),
      sharpe: sharpeRatio(returns),
    };
    return metrics;
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PORT || '8080', 10);
  buildServer().listen({ port, host: '0.0.0.0' }).then(() => {
    console.log(`HTTP server listening on ${port}`);
  });
}