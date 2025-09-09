import { log } from './logger';

export interface Ticker {
  bid: number;
  ask: number;
}

export async function fetchMexcTicker(symbol: string): Promise<Ticker | undefined> {
  const url = `https://api.mexc.com/api/v3/ticker/bookTicker?symbol=${symbol}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data: any = await res.json();
    const bid = Number(data.bidPrice);
    const ask = Number(data.askPrice);
    if (isFinite(bid) && isFinite(ask)) return { bid, ask };
  } catch (err: any) {
    log('error', 'Erro ao buscar ticker da MEXC', { symbol, err: err.message });
  }
  return undefined;
}

export async function fetchBtccTicker(symbol: string): Promise<Ticker | undefined> {
  const url = `https://api.btcc.com/api/market/ticker?symbol=${symbol}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data: any = await res.json();
    // API retorna campos 'buy' e 'sell' como strings
    const bid = Number(data.buy ?? data.bidPrice);
    const ask = Number(data.sell ?? data.askPrice);
    if (isFinite(bid) && isFinite(ask)) return { bid, ask };
  } catch (err: any) {
    log('error', 'Erro ao buscar ticker da BTCC', { symbol, err: err.message });
  }
  return undefined;
}
