import { fetchMexcTicker, fetchBtccTicker, btccWsBackoffActive } from './exchanges';
import { CFG } from './config';
import { log } from './logger';
import { publishOpportunity } from './opportunitySink';
import { computeNetSpread } from './marginUtils';
import { Opportunity } from './types';

export async function checkSymbol(symbol: string) {
  if (btccWsBackoffActive()) {
    log('warn', 'BTCC WS em backoff após 403; pulando símbolo', { symbol });
    return;
  }

  const mexcSymbol = symbol.replace(/[\/_]/g, '');
  const btccSymbol = symbol.replace('/', '_');

  log('debug', '🔍 Iniciando verificação de arbitragem', { symbol, mexcSymbol, btccSymbol });
  const mexc = await fetchMexcTicker(mexcSymbol);
  if (!mexc) {
    log('error', 'Ticker da MEXC indisponível', { symbol, mexcSymbol });
  }
  const btcc = await fetchBtccTicker(btccSymbol);
  if (!btcc) {
    log('error', 'Ticker da BTCC indisponível', { symbol, btccSymbol });
  }

  if (!mexc || !btcc) {
    log('warn', 'Ticker indisponível em alguma exchange', {
      symbol,
      mexcSymbol,
      btccSymbol,
      mexcOk: !!mexc,
      btccOk: !!btcc
    });
    return;
  }

  const scenarios = [
    { buyEx: 'mexc' as const, sellEx: 'btcc' as const, buy: mexc.ask, sell: btcc.bid },
    { buyEx: 'btcc' as const, sellEx: 'mexc' as const, buy: btcc.ask, sell: mexc.bid },
  ];

  for (const s of scenarios) {
    const { spreadPct, estEntryCostPct, netSpreadPct } = computeNetSpread(
      s.buy,
      s.sell,
      CFG.fees[s.buyEx].spotTaker,
      CFG.fees[s.sellEx].spotTaker,
      CFG.slippagePct
    );

    log('debug', `📈 Avaliando ${s.buyEx}→${s.sellEx}`, {
      symbol,
      buyPrice: s.buy,
      sellPrice: s.sell,
      spreadPct,
      netSpreadPct
    });

    if (netSpreadPct >= CFG.minSpreadPct) {
      const op: Opportunity = {
        ts: Date.now(),
        symbol,
        buyExchange: s.buyEx,
        sellExchange: s.sellEx,
        buyPrice: s.buy,
        sellPrice: s.sell,
        spreadPct,
        estEntryCostPct,
        netSpreadPct
      };
      publishOpportunity(op);
      log('info', '🚀 OPORTUNIDADE ENCONTRADA!', op);
    }
  }
}
