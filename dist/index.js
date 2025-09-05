"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const exchanges_1 = require("./exchanges");
const arbitrage_1 = require("./arbitrage");
const logger_1 = require("./logger");
async function main() {
    await (0, exchanges_1.initExchanges)();
    (0, logger_1.log)("info", "Iniciando loop", { symbols: config_1.CFG.symbols, pollMs: config_1.CFG.pollMs });
    setInterval(async () => {
        for (const s of config_1.CFG.symbols) {
            try {
                await (0, arbitrage_1.checkSymbol)(s);
            }
            catch (e) {
                (0, logger_1.log)("error", "Erro ao checar símbolo", { symbol: s, err: e?.message });
            }
        }
    }, config_1.CFG.pollMs);
}
main().catch(err => {
    (0, logger_1.log)("error", "Fatal init error", { err: String(err) });
    process.exit(1);
});
