"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSymbol = checkSymbol;
const exchanges_1 = require("./exchanges");
const config_1 = require("./config");
const logger_1 = require("./logger");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dayjs_1 = __importDefault(require("dayjs"));
const utils_1 = require("./utils");
/** arquivo JSONL diário de oportunidades */
function opportunitiesPath() {
    const dir = path_1.default.join(process.cwd(), "data");
    fs_1.default.mkdirSync(dir, { recursive: true });
    const date = (0, dayjs_1.default)().format("YYYY-MM-DD");
    return path_1.default.join(dir, `opportunities-${date}.jsonl`);
}
async function fetchBestAsk(exchange, symbol) {
    const ob = await exchange.fetchOrderBook(symbol, 5);
    return ob.asks?.[0]?.[0];
}
async function fetchBestBid(exchange, symbol) {
    const ob = await exchange.fetchOrderBook(symbol, 5);
    return ob.bids?.[0]?.[0];
}
async function tryFunding8h(exchange, perpSymbol, label) {
    // Algumas exchanges suportam fetchFundingRate no CCXT; fallback heurístico se não houver
    try {
        const r = await exchange.fetchFundingRate(perpSymbol);
        const rate = (0, utils_1.safeNumber)(r?.fundingRate); // fração por 8h
        const next = (0, utils_1.safeNumber)(r?.nextFundingTime ?? r?.fundingTime);
        if (rate !== undefined) {
            return { exchange: label, symbol: perpSymbol, rate8hPct: rate, nextFundingTime: next, source: "fetchFundingRate" };
        }
    }
    catch (e) {
        // ignora – cai no fallback
    }
    return undefined;
}
/** Heurística: funding tende a acompanhar o sinal do basis (perp vs spot). Magnitude conservadora */
function fundingHeuristicFromBasis(exchange, perpSymbol, basisPct) {
    // magnitude conservadora: 1/5 do basis (cap em ±0.02%/8h)
    const est = Math.max(-0.0002, Math.min(0.0002, basisPct / 5));
    return { exchange, symbol: perpSymbol, rate8hPct: est, source: "basisHeuristic" };
}
function writeOpportunity(op) {
    const line = JSON.stringify(op);
    fs_1.default.appendFileSync(opportunitiesPath(), line + "\n");
}
function entryCostPct(scenario) {
    const slip = config_1.CFG.slippagePct;
    if (scenario === "SHORT_PERP_MEXC_LONG_SPOT_GATE") {
        return config_1.CFG.fees.mexc.perpTaker + config_1.CFG.fees.gate.spotTaker + 2 * slip;
    }
    return config_1.CFG.fees.gate.perpTaker + config_1.CFG.fees.mexc.spotTaker + 2 * slip;
}
async function checkSymbol(baseSpot) {
    const base = baseSpot.split("/")[0]; // "BTC" em "BTC/USDT"
    // resolve símbolos
    const mexcSpot = `${base}/USDT`;
    const gateSpot = `${base}/USDT`;
    const mexcPerp = (0, exchanges_1.findPerpSymbol)(exchanges_1.mexc, base);
    const gatePerp = (0, exchanges_1.findPerpSymbol)(exchanges_1.gate, base);
    if (!mexcPerp || !gatePerp) {
        (0, logger_1.log)("warn", "Perp não encontrado para base", { base, mexcPerp, gatePerp });
        return;
    }
    // Preços necessários
    const [mexcPerpBid, gatePerpBid, mexcSpotAsk, gateSpotAsk] = await Promise.all([
        fetchBestBid(exchanges_1.mexc, mexcPerp),
        fetchBestBid(exchanges_1.gate, gatePerp),
        fetchBestAsk(exchanges_1.mexc, mexcSpot),
        fetchBestAsk(exchanges_1.gate, gateSpot)
    ]);
    if (![mexcPerpBid, gatePerpBid, mexcSpotAsk, gateSpotAsk].every(Number.isFinite)) {
        (0, logger_1.log)("warn", "Falha ao obter book", { base, mexcPerpBid, gatePerpBid, mexcSpotAsk, gateSpotAsk });
        return;
    }
    // Funding no lado curto (preferimos dados da exchange; senão, heurística pelo basis)
    // Cenário A: short perp MEXC, long spot Gate
    let fundingShortMexc = await tryFunding8h(exchanges_1.mexc, mexcPerp, "mexc");
    const basisA = (mexcPerpBid - gateSpotAsk) / gateSpotAsk;
    if (!fundingShortMexc)
        fundingShortMexc = fundingHeuristicFromBasis("mexc", mexcPerp, basisA);
    // Cenário B: short perp GATE, long spot MEXC
    let fundingShortGate = await tryFunding8h(exchanges_1.gate, gatePerp, "gate");
    const basisB = (gatePerpBid - mexcSpotAsk) / mexcSpotAsk;
    if (!fundingShortGate)
        fundingShortGate = fundingHeuristicFromBasis("gate", gatePerp, basisB);
    // Monta oportunidades se baterem os limiares
    const scenarios = [
        { scenario: "SHORT_PERP_MEXC_LONG_SPOT_GATE", spotExchange: "gate", perpExchange: "mexc",
            spotAsk: gateSpotAsk, perpBid: mexcPerpBid, basisPct: basisA, shortFunding: fundingShortMexc },
        { scenario: "SHORT_PERP_GATE_LONG_SPOT_MEXC", spotExchange: "mexc", perpExchange: "gate",
            spotAsk: mexcSpotAsk, perpBid: gatePerpBid, basisPct: basisB, shortFunding: fundingShortGate },
    ];
    for (const s of scenarios) {
        const cost = entryCostPct(s.scenario);
        const netBasis = s.basisPct - cost;
        const basisOK = netBasis >= config_1.CFG.minBasisPct;
        const fundingOK = (s.shortFunding.rate8hPct ?? 0) >= config_1.CFG.minFunding8hPct;
        if (basisOK || fundingOK) {
            const op = {
                ts: Date.now(),
                base,
                scenario: s.scenario,
                spotExchange: s.spotExchange,
                perpExchange: s.perpExchange,
                spotSymbol: `${base}/USDT`,
                perpSymbol: s.perpExchange === "mexc" ? mexcPerp : gatePerp,
                spotAsk: s.spotAsk,
                perpBid: s.perpBid,
                basisPct: s.basisPct,
                estEntryCostPct: cost,
                netBasisPct: netBasis,
                shortFunding: s.shortFunding,
                ruleTriggered: basisOK && fundingOK ? "both" : (basisOK ? "basis" : "funding")
            };
            writeOpportunity(op);
            (0, logger_1.log)("info", "OPORTUNIDADE", op);
        }
        else {
            (0, logger_1.log)("debug", "Sem oportunidade", {
                base,
                basisPct: s.basisPct,
                estEntryCostPct: cost,
                netBasisPct: netBasis,
                shortFunding8hPct: s.shortFunding.rate8hPct
            });
        }
    }
}
