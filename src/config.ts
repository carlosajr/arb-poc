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

export const MODE = process.env.ARB_MODE || "margin";

const fundingSymbolsEnv = (process.env.FUNDING_SYMBOLS || "BTC_USDT").split(",").map(s => s.trim());

export const FUNDING_CFG = {
  symbols: fundingSymbolsEnv,
  minBps: n("FUNDING_MIN_BPS", 2),
  safetyBps: n("FUNDING_SAFETY_BPS", 1),
  collectHoursDefault: n("FUNDING_COLLECT_HOURS_DEFAULT", 8),
  notionalUsdt: n("FUNDING_NOTIONAL_USDT", 1000),
  scanIntervalMs: n("FUNDING_SCAN_INTERVAL_MS", 30000)
};
