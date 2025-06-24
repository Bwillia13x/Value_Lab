"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fundFetcher_1 = require("./services/fundFetcher");
const path_1 = __importDefault(require("path"));
function isErrorWithMessage(error) {
    return (typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string');
}
function toErrorWithMessage(maybeError) {
    if (isErrorWithMessage(maybeError))
        return maybeError;
    try {
        return new Error(JSON.stringify(maybeError));
    }
    catch {
        return new Error(String(maybeError));
    }
}
function getErrorMessage(error) {
    return toErrorWithMessage(error).message;
}
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV || 'development';
// Security middleware for production
if (nodeEnv === 'production') {
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    // Basic security headers
    app.use((_req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        next();
    });
}
// serve static frontend
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
app.get('/health', (_req, res) => {
    const healthCheck = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: nodeEnv,
        version: process.env.npm_package_version || '1.0.0'
    };
    res.json(healthCheck);
});
app.get('/fund/:ticker', async (req, res) => {
    try {
        const ticker = req.params.ticker;
        if (!ticker || typeof ticker !== 'string') {
            res.status(400).json({ error: 'Invalid ticker parameter' });
            return;
        }
        console.log(`Fetching data for ticker: ${ticker}`);
        const data = await (0, fundFetcher_1.getFundReturns)(ticker);
        console.log(`Successfully fetched ${data.length} data points for ${ticker}`);
        res.json(data);
    }
    catch (err) {
        const errorMessage = getErrorMessage(err);
        console.error(`Error fetching data for ticker ${req.params.ticker}:`, errorMessage);
        res.status(500).json({ error: errorMessage });
    }
});
app.listen(port, () => {
    console.log(`Value Lab server listening on http://localhost:${port}`);
});
