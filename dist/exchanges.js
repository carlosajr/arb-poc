"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.gate = exports.mexc = void 0;
exports.initExchanges = initExchanges;
exports.findPerpSymbol = findPerpSymbol;
const ccxt = __importStar(require("ccxt"));
const logger_1 = require("./logger");
exports.mexc = new ccxt.mexc({
    enableRateLimit: true,
    apiKey: process.env.MEXC_API_KEY || undefined,
    secret: process.env.MEXC_API_SECRET || undefined
});
exports.gate = new ccxt.gate({
    enableRateLimit: true,
    apiKey: process.env.GATE_API_KEY || undefined,
    secret: process.env.GATE_API_SECRET || undefined
});
async function initExchanges() {
    await exports.mexc.loadMarkets();
    await exports.gate.loadMarkets();
    (0, logger_1.log)("info", "Markets loaded", {
        mexcSymbols: Object.keys(exports.mexc.markets).length,
        gateSymbols: Object.keys(exports.gate.markets).length
    });
}
/**
 * Encontra o símbolo do perp (swap) USDT-margined para um base, ex.: "BTC/USDT:USDT"
 */
function findPerpSymbol(ex, base) {
    for (const m of Object.values(ex.markets)) {
        if (!m)
            continue;
        const mk = m;
        if (mk && mk.swap && mk.contract && mk.settle === "USDT" && mk.base === base) {
            return mk.symbol; // ex.: "BTC/USDT:USDT"
        }
    }
    return undefined;
}
