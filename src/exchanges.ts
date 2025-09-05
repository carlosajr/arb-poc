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
  const exchangeName = ex.id;
  log("debug", `🔍 Buscando perp para ${base} na ${exchangeName}`, { base, exchange: exchangeName });
  
  // Primeiro, vamos listar todos os contratos perpétuos disponíveis
  const availablePerps: string[] = [];
  const basePerps: string[] = [];
  
  for (const m of Object.values(ex.markets)) {
    if (!m) continue;
    const mk = m as ccxt.Market;
    if (mk && mk.swap && mk.contract && mk.settle === "USDT") {
      availablePerps.push(`${mk.base}/USDT:USDT`);
      if (mk.base === base) {
        basePerps.push(mk.symbol);
        log("debug", `✅ Encontrado perp para ${base}`, { 
          symbol: mk.symbol, 
          base: mk.base, 
          exchange: exchangeName 
        });
        return mk.symbol; // ex.: "BTC/USDT:USDT"
      }
    }
  }
  
  // Se não encontrou, vamos mostrar o que está disponível
  log("debug", `❌ Perp não encontrado para ${base} na ${exchangeName}`, {
    base,
    exchange: exchangeName,
    totalPerpsAvailable: availablePerps.length,
    samplePerps: availablePerps.slice(0, 10), // Mostra apenas os primeiros 10
    searchedFor: `${base}/USDT:USDT`
  });
  
  return undefined;
}
