import { MODE } from "./config";
import { MarginArbScanner } from "./marginScanner";
import { FundingRateScanner } from "./fundingScanner";
import { log } from "./logger";

async function main() {
  const mode = MODE;
  log("info", "Iniciando aplicação", { mode });

  if (mode === "funding") {
    const scanner = new FundingRateScanner();
    await scanner.start();
  } else {
    const scanner = new MarginArbScanner();
    await scanner.start();
  }
}

main().catch(err => {
  log("error", "Fatal init error", { err: String(err) });
  process.exit(1);
});

