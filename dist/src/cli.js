#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fundFetcher_1 = require("./services/fundFetcher");
const metrics_1 = require("./metrics");
const [, , ticker] = process.argv;
if (!ticker) {
    console.error('Usage: value-lab <TICKER>');
    process.exit(1);
}
(async () => {
    try {
        console.log(`Fetching data for ${ticker}...`);
        const series = await (0, fundFetcher_1.getFundReturns)(ticker);
        const start = series[0].price;
        const end = series[series.length - 1].price;
        const years = series.length / 12;
        const annualised = (0, metrics_1.cagr)(start, end, years);
        const mdd = (0, metrics_1.maxDrawdown)(series.map(d => d.index));
        console.log('--- Metrics ---');
        console.log(`Period          : ${(years).toFixed(1)} years`);
        console.log(`CAGR            : ${(annualised * 100).toFixed(2)} %`);
        console.log(`Max Drawdown    : ${(mdd * 100).toFixed(2)} %`);
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
