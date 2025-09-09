import 'dotenv/config';

function n(name: string, def: number): number {
  const v = process.env[name];
  if (!v) return def;
  const num = Number(v);
  return Number.isFinite(num) ? num : def;
}

const symbolsEnv = (process.env.SYMBOLS || 'FLOCK_USDT')
  .split(',')
  .map(s => s.trim().toUpperCase());

export const CFG = {
  symbols: symbolsEnv,
  pollMs: n('POLL_MS', 5000),
  fees: {
    mexc: { spotTaker: n('MEXC_SPOT_TAKER', 0.001) },
    btcc: { spotTaker: n('BTCC_SPOT_TAKER', 0.001) }
  },
  slippagePct: n('SLIPPAGE_PCT', 0.0005),
  minSpreadPct: n('MIN_SPREAD_PCT', 0.001)
};
