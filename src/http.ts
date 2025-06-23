import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getFundReturns } from './services/fundFetcher';
import { cagr, maxDrawdown, volatility, sharpeRatio } from './metrics';

export async function buildServer() {
  const app = Fastify({ logger: true });

  app.get('/fund/:ticker', async (request: FastifyRequest<{ Params: { ticker: string } }>, reply: FastifyReply) => {
    const { ticker } = request.params as { ticker: string };
    try {
      const series = await getFundReturns(ticker);
      return { ticker, series };
    } catch (err) {
      app.log.error(err);
      reply.code(500);
      return { error: 'Failed to fetch fund data' };
    }
  });

  app.get('/fund/:ticker/metrics', async (request: FastifyRequest<{ Params: { ticker: string } }>, reply: FastifyReply) => {
    const { ticker } = request.params as { ticker: string };
    try {
      const series = await getFundReturns(ticker);
      const prices = series.map(s => s.price);
      const returns = series.slice(1).map(s => s.return ?? 0);
      const years = series.length / 12;

      const metrics = {
        cagr: cagr(prices[0], prices[prices.length - 1], years),
        maxDrawdown: maxDrawdown(series.map(s => s.index)),
        volatility: volatility(returns),
        sharpeRatio: sharpeRatio(returns),
      };
      return { ticker, metrics };
    } catch (err) {
      app.log.error(err);
      reply.code(500);
      return { error: 'Failed to compute metrics' };
    }
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // CLI execution: node dist/http.js --port 8080
  (async () => {
    const portArgIndex = process.argv.indexOf('--port');
    const port = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : 8080;
    const server = await buildServer();
    server.listen({ port, host: '0.0.0.0' });
  })();
}