export function computeSpread(buy: number, sell: number): number {
  return (sell - buy) / buy;
}

export function computeNetSpread(
  buy: number,
  sell: number,
  buyFee: number,
  sellFee: number,
  slippagePct: number
) {
  const spreadPct = computeSpread(buy, sell);
  const estEntryCostPct = buyFee + sellFee + 2 * slippagePct;
  const netSpreadPct = spreadPct - estEntryCostPct;
  return { spreadPct, estEntryCostPct, netSpreadPct };
}
