import "dotenv/config";

function n(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const num = Number(v);
  if (Number.isFinite(num)) return num;
  return def;
}

const symbolsEnv = (process.env.SYMBOLS || "BTC/USDT").split(",").map(s => s.trim());

export const CFG = {
  symbols: symbolsEnv,                 // ex.: ["BTC/USDT", "ETH/USDT"]
  pollMs: n("POLL_MS", 5000),

  fees: {
    mexc: { spotTaker: n("MEXC_SPOT_TAKER", 0.001), perpTaker: n("MEXC_PERP_TAKER", 0.0002) },
    gate: { spotTaker: n("GATE_SPOT_TAKER", 0.001), perpTaker: n("GATE_PERP_TAKER", 0.0005) }
  },

  slippagePct: n("SLIPPAGE_PCT", 0.0005),
  minBasisPct: n("MIN_BASIS_PCT", 0.001),
  minFunding8hPct: n("MIN_FUNDING_8H_PCT", 0.0005)
};
