import { CFG } from "./config";
import { initExchanges } from "./exchanges";
import { checkSymbol } from "./arbitrage";
import { log } from "./logger";

async function main() {
  await initExchanges();
  log("info", "Iniciando loop", { symbols: CFG.symbols, pollMs: CFG.pollMs });

  setInterval(async () => {
    for (const s of CFG.symbols) {
      try {
        await checkSymbol(s);
      } catch (e: any) {
        log("error", "Erro ao checar símbolo", { symbol: s, err: e?.message });
      }
    }
  }, CFG.pollMs);
}

main().catch(err => {
  log("error", "Fatal init error", { err: String(err) });
  process.exit(1);
});
