"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maxDrawdown = exports.cagr = exports.getFundReturns = void 0;
var fundFetcher_1 = require("./services/fundFetcher");
Object.defineProperty(exports, "getFundReturns", { enumerable: true, get: function () { return fundFetcher_1.getFundReturns; } });
var metrics_1 = require("./metrics");
Object.defineProperty(exports, "cagr", { enumerable: true, get: function () { return metrics_1.cagr; } });
Object.defineProperty(exports, "maxDrawdown", { enumerable: true, get: function () { return metrics_1.maxDrawdown; } });
