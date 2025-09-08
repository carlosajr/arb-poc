import { initExchanges, findPerpSymbol, mexc, gate } from "./exchanges";
import { log } from "./logger";
import { safeNumber } from "./utils";
import { publishOpportunity } from "./opportunitySink";
import { FUNDING_CFG } from "./config";
import { FundingRateSnapshot } from "./types";
import { calcMetrics, evaluateOpportunity, FundingParams } from "./fundingUtils";

export class FundingRateScanner {
  async start() {
    await initExchanges();
    log("info", "Iniciando FundingRateScanner", {
      symbols: FUNDING_CFG.symbols,
      pollMs: FUNDING_CFG.scanIntervalMs,
      params: FUNDING_CFG
    });

    setInterval(async () => {
      for (const s of FUNDING_CFG.symbols) {
        try {
          await this.scanSymbol(s);
        } catch (e: any) {
          log("error", "Erro ao checar símbolo funding", { symbol: s, err: e?.message });
        }
      }
    }, FUNDING_CFG.scanIntervalMs);
  }

  private async fetchSnapshot(ex: any, perpSymbol: string, label: "mexc" | "gate"): Promise<FundingRateSnapshot> {
    const r = await ex.fetchFundingRate(perpSymbol);
    const rate = safeNumber(r?.fundingRate) ?? 0;
    const intervalMs = safeNumber((r as any)?.fundingInterval);
    const collectHours = intervalMs ? intervalMs / 3600000 : FUNDING_CFG.collectHoursDefault;
    const next = safeNumber(r?.nextFundingTime ?? r?.nextFundingTimestamp);
    return { exchange: label, symbol: perpSymbol, rate, collectHours, nextFundingTime: next };
  }

  private async scanSymbol(sym: string) {
    const base = sym.split("_")[0];
    const mexcPerp = findPerpSymbol(mexc, base);
    const gatePerp = findPerpSymbol(gate, base);
    if (!mexcPerp || !gatePerp) {
      log("warn", "Perp não encontrado", { symbol: sym, mexcPerp, gatePerp });
      return;
    }

    const [mexcSnap, gateSnap] = await Promise.all([
      this.fetchSnapshot(mexc, mexcPerp, "mexc").catch(e => {
        log("error", "Erro ao obter funding", { exchange: "mexc", symbol: sym, err: e?.message });
        return undefined;
      }),
      this.fetchSnapshot(gate, gatePerp, "gate").catch(e => {
        log("error", "Erro ao obter funding", { exchange: "gate", symbol: sym, err: e?.message });
        return undefined;
      })
    ]);

    if (!mexcSnap || !gateSnap) return;

    log("debug", "📊 Funding snapshots", { symbol: sym, mexc: mexcSnap, gate: gateSnap });

    const params: FundingParams = {
      notional: FUNDING_CFG.notionalUsdt,
      minBps: FUNDING_CFG.minBps,
      safetyBps: FUNDING_CFG.safetyBps
    };

    const opp = evaluateOpportunity(sym, { mexc: mexcSnap, gate: gateSnap }, params);
    if (opp) {
      publishOpportunity(opp);
      log("info", "🚀 OPORTUNIDADE FUNDING", opp);
    } else {
      const candidates = [mexcSnap, gateSnap];
      let chosen = candidates[0];
      if ((candidates[1].rate ?? 0) > (chosen.rate ?? 0)) chosen = candidates[1];
      const metrics = calcMetrics(chosen.rate ?? 0, chosen.collectHours, params.notional);
      log("debug", "Nenhuma oportunidade", {
        symbol: sym,
        chosenShortPerp: chosen.exchange,
        fundingBps: metrics.fundingBps,
        pnlPorDia: metrics.pnlPorDia,
        thresholdBps: params.minBps + params.safetyBps,
        pnlMin: params.notional * (params.safetyBps / 10000)
      });
    }
  }
}

