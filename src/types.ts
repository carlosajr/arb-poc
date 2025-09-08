export type Scenario =
  | "SHORT_PERP_MEXC_LONG_SPOT_GATE"
  | "SHORT_PERP_GATE_LONG_SPOT_MEXC";

export interface FundingSnapshot {
  exchange: "mexc" | "gate";
  symbol: string;
  rate8hPct?: number;      // fração (ex.: 0.0001 = 0,01%/8h)
  nextFundingTime?: number;
  source: "fetchFundingRate" | "basisHeuristic";
}

export interface Opportunity {
  ts: number;
  base: string;              // BTC, ETH...
  scenario: Scenario;
  spotExchange: "mexc" | "gate";
  perpExchange: "mexc" | "gate";
  spotSymbol: string;
  perpSymbol: string | undefined;
  spotAsk: number;
  perpBid: number;
  basisPct: number;          // (perpBid - spotAsk)/spotAsk
  estEntryCostPct: number;   // taxas + slippages de entrada
  netBasisPct: number;       // basisPct - estEntryCostPct
  shortFunding?: FundingSnapshot;
  ruleTriggered: "basis" | "funding" | "both";
}

export interface FundingRateSnapshot {
  exchange: "mexc" | "gate";
  symbol: string;
  rate: number;          // fração por janela (ex.: 0.0001)
  collectHours: number;
  nextFundingTime?: number;
}

export interface FundingRateOpportunity {
  kind: "funding";
  ts: number;
  symbol: string; // ex.: BTC_USDT
  snapshots: { mexc: FundingRateSnapshot; gate: FundingRateSnapshot };
  chosenShortPerp: "mexc" | "gate";
  theoreticalLongSpot: "mexc" | "gate";
  fundingBps: number;
  pnlPorJanela: number;
  pnlPorDia: number;
  aprAprox: number;
  params: { notional: number; minBps: number; safetyBps: number };
}
