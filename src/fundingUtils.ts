import { FundingRateSnapshot, FundingRateOpportunity } from "./types";

export interface FundingParams {
  notional: number;
  minBps: number;
  safetyBps: number;
}

export function calcMetrics(rate: number, collectHours: number, notional: number) {
  const fundingBps = rate * 10000;
  const pnlPorJanela = notional * rate;
  const pnlPorDia = pnlPorJanela * (24 / collectHours);
  const aprAprox = rate * (24 / collectHours) * 365;
  return { fundingBps, pnlPorJanela, pnlPorDia, aprAprox };
}

export function evaluateOpportunity(
  symbol: string,
  snapshots: { mexc: FundingRateSnapshot; gate: FundingRateSnapshot },
  params: FundingParams
): FundingRateOpportunity | undefined {
  const candidates = [snapshots.mexc, snapshots.gate];
  let chosen = candidates[0];
  if ((candidates[1].rate ?? 0) > (chosen.rate ?? 0)) chosen = candidates[1];

  const rate = chosen.rate ?? 0;
  const metrics = calcMetrics(rate, chosen.collectHours, params.notional);
  const thresholdBps = params.minBps + params.safetyBps;
  const pnlBuffer = params.notional * (params.safetyBps / 10000);

  if (metrics.fundingBps >= thresholdBps && metrics.pnlPorDia > pnlBuffer) {
    return {
      kind: "funding",
      ts: Date.now(),
      symbol,
      snapshots,
      chosenShortPerp: chosen.exchange,
      theoreticalLongSpot: chosen.exchange === "mexc" ? "gate" : "mexc",
      fundingBps: metrics.fundingBps,
      pnlPorJanela: metrics.pnlPorJanela,
      pnlPorDia: metrics.pnlPorDia,
      aprAprox: metrics.aprAprox,
      params: {
        notional: params.notional,
        minBps: params.minBps,
        safetyBps: params.safetyBps
      }
    };
  }

  return undefined;
}

