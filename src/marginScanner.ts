import { CFG } from "./config";
import { initExchanges } from "./exchanges";
import { checkSymbol } from "./arbitrage";
import { log } from "./logger";

export class MarginArbScanner {
  async start() {
    await initExchanges();
    log("info", "Iniciando loop", { symbols: CFG.symbols, pollMs: CFG.pollMs });

    setInterval(async () => {
      log("debug", "🔄 Iniciando novo ciclo de verificação", {
        symbols: CFG.symbols,
        timestamp: new Date().toISOString()
      });

      for (const s of CFG.symbols) {
        try {
          await checkSymbol(s);
        } catch (e: any) {
          log("error", "Erro ao checar símbolo", { symbol: s, err: e?.message });
        }
      }

      log("debug", "✅ Ciclo de verificação concluído", {
        symbols: CFG.symbols.length,
        nextCheck: new Date(Date.now() + CFG.pollMs).toISOString()
      });
    }, CFG.pollMs);
  }
}

