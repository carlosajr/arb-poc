import { gate, mexc, findPerpSymbol } from "./exchanges";
import type { Opportunity, Scenario, FundingSnapshot } from "./types";
import { CFG } from "./config";
import { log } from "./logger";
import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import { safeNumber } from "./utils";

/** arquivo JSONL diário de oportunidades */
function opportunitiesPath() {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const date = dayjs().format("YYYY-MM-DD");
  return path.join(dir, `opportunities-${date}.jsonl`);
}

async function fetchBestAsk(exchange: any, symbol: string): Promise<number | undefined> {
  const ob = await exchange.fetchOrderBook(symbol, 5);
  return ob.asks?.[0]?.[0];
}

async function fetchBestBid(exchange: any, symbol: string): Promise<number | undefined> {
  const ob = await exchange.fetchOrderBook(symbol, 5);
  return ob.bids?.[0]?.[0];
}

async function tryFunding8h(exchange: any, perpSymbol: string, label: "mexc" | "gate"): Promise<FundingSnapshot | undefined> {
  // Algumas exchanges suportam fetchFundingRate no CCXT; fallback heurístico se não houver
  try {
    const r = await exchange.fetchFundingRate(perpSymbol);
    const rate = safeNumber(r?.fundingRate); // fração por 8h
    const next = safeNumber(r?.nextFundingTime ?? r?.fundingTime);
    if (rate !== undefined) {
      return { exchange: label, symbol: perpSymbol, rate8hPct: rate, nextFundingTime: next, source: "fetchFundingRate" };
    }
  } catch (e) {
    // ignora – cai no fallback
  }
  return undefined;
}

/** Heurística: funding tende a acompanhar o sinal do basis (perp vs spot). Magnitude conservadora */
function fundingHeuristicFromBasis(exchange: "mexc" | "gate", perpSymbol: string, basisPct: number): FundingSnapshot {
  // magnitude conservadora: 1/5 do basis (cap em ±0.02%/8h)
  const est = Math.max(-0.0002, Math.min(0.0002, basisPct / 5));
  return { exchange, symbol: perpSymbol, rate8hPct: est, source: "basisHeuristic" };
}

function writeOpportunity(op: Opportunity) {
  const line = JSON.stringify(op);
  fs.appendFileSync(opportunitiesPath(), line + "\n");
}

function entryCostPct(scenario: Scenario): number {
  const slip = CFG.slippagePct;
  if (scenario === "SHORT_PERP_MEXC_LONG_SPOT_GATE") {
    return CFG.fees.mexc.perpTaker + CFG.fees.gate.spotTaker + 2 * slip;
  }
  return CFG.fees.gate.perpTaker + CFG.fees.mexc.spotTaker + 2 * slip;
}

export async function checkSymbol(baseSpot: string) {
  const base = baseSpot.split("/")[0]; // "BTC" em "BTC/USDT"

  // resolve símbolos
  const mexcSpot = `${base}/USDT`;
  const gateSpot = `${base}/USDT`;
  const mexcPerp = findPerpSymbol(mexc, base);
  const gatePerp = findPerpSymbol(gate, base);

  if (!mexcPerp || !gatePerp) {
    log("warn", "Perp não encontrado para base", { base, mexcPerp, gatePerp });
    return;
  }

  // Preços necessários
  const [mexcPerpBid, gatePerpBid, mexcSpotAsk, gateSpotAsk] = await Promise.all([
    fetchBestBid(mexc, mexcPerp),
    fetchBestBid(gate, gatePerp),
    fetchBestAsk(mexc, mexcSpot),
    fetchBestAsk(gate, gateSpot)
  ]);

  if (![mexcPerpBid, gatePerpBid, mexcSpotAsk, gateSpotAsk].every(Number.isFinite)) {
    log("warn", "Falha ao obter book", { base, mexcPerpBid, gatePerpBid, mexcSpotAsk, gateSpotAsk });
    return;
  }

  // Funding no lado curto (preferimos dados da exchange; senão, heurística pelo basis)
  // Cenário A: short perp MEXC, long spot Gate
  let fundingShortMexc = await tryFunding8h(mexc, mexcPerp, "mexc");
  const basisA = (mexcPerpBid! - gateSpotAsk!) / gateSpotAsk!;
  if (!fundingShortMexc) fundingShortMexc = fundingHeuristicFromBasis("mexc", mexcPerp, basisA);

  // Cenário B: short perp GATE, long spot MEXC
  let fundingShortGate = await tryFunding8h(gate, gatePerp, "gate");
  const basisB = (gatePerpBid! - mexcSpotAsk!) / mexcSpotAsk!;
  if (!fundingShortGate) fundingShortGate = fundingHeuristicFromBasis("gate", gatePerp, basisB);

  // Monta oportunidades se baterem os limiares
  const scenarios: Array<{scenario: Scenario, spotExchange: "mexc"|"gate", perpExchange: "mexc"|"gate",
                          spotAsk: number, perpBid: number, basisPct: number, shortFunding: FundingSnapshot}> = [
    { scenario: "SHORT_PERP_MEXC_LONG_SPOT_GATE", spotExchange: "gate", perpExchange: "mexc",
      spotAsk: gateSpotAsk!, perpBid: mexcPerpBid!, basisPct: basisA, shortFunding: fundingShortMexc },
    { scenario: "SHORT_PERP_GATE_LONG_SPOT_MEXC", spotExchange: "mexc", perpExchange: "gate",
      spotAsk: mexcSpotAsk!, perpBid: gatePerpBid!, basisPct: basisB, shortFunding: fundingShortGate },
  ];

  for (const s of scenarios) {
    const cost = entryCostPct(s.scenario);
    const netBasis = s.basisPct - cost;

    const basisOK = netBasis >= CFG.minBasisPct;
    const fundingOK = (s.shortFunding.rate8hPct ?? 0) >= CFG.minFunding8hPct;

    if (basisOK || fundingOK) {
      const op: Opportunity = {
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
      log("info", "OPORTUNIDADE", op);
    } else {
      log("debug", "Sem oportunidade", {
        base,
        basisPct: s.basisPct,
        estEntryCostPct: cost,
        netBasisPct: netBasis,
        shortFunding8hPct: s.shortFunding.rate8hPct
      });
    }
  }
}
