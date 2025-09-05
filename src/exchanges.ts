import * as ccxt from "ccxt";
import { log } from "./logger";

export const mexc = new ccxt.mexc({
  enableRateLimit: true,
  apiKey: process.env.MEXC_API_KEY || undefined,
  secret: process.env.MEXC_API_SECRET || undefined
});

export const gate = new ccxt.gate({
  enableRateLimit: true,
  apiKey: process.env.GATE_API_KEY || undefined,
  secret: process.env.GATE_API_SECRET || undefined
});

export async function initExchanges() {
  await mexc.loadMarkets();
  await gate.loadMarkets();
  log("info", "Markets loaded", {
    mexcSymbols: Object.keys(mexc.markets).length,
    gateSymbols: Object.keys(gate.markets).length
  });
}

/**
 * Encontra o símbolo do perp (swap) USDT-margined para um base, ex.: "BTC/USDT:USDT"
 */
export function findPerpSymbol(ex: ccxt.Exchange, base: string): string | undefined {
  for (const m of Object.values(ex.markets)) {
    if (!m) continue;
    const mk = m as ccxt.Market;
    if (mk && mk.swap && mk.contract && mk.settle === "USDT" && mk.base === base) {
      return mk.symbol; // ex.: "BTC/USDT:USDT"
    }
  }
  return undefined;
}
