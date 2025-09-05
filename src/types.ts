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
