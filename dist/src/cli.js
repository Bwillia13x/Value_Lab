#!/usr/bin/env node
import { getFundReturns } from './services/fundFetcher';
import { cagr, maxDrawdown } from './metrics';
const [, , ticker] = process.argv;
if (!ticker) {
    console.error('Usage: value-lab <TICKER>');
    process.exit(1);
}
(async () => {
    try {
        console.log(`Fetching data for ${ticker}...`);
        const series = await getFundReturns(ticker);
        const start = series[0].price;
        const end = series[series.length - 1].price;
        const years = series.length / 12;
        const annualised = cagr(start, end, years);
        const mdd = maxDrawdown(series.map(d => d.index));
        console.log('--- Metrics ---');
        console.log(`Period          : ${years.toFixed(1)} years`);
        console.log(`CAGR            : ${(annualised * 100).toFixed(2)} %`);
        console.log(`Max Drawdown    : ${(mdd * 100).toFixed(2)} %`);
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
