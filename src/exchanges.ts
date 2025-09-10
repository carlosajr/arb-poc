import WebSocket from 'ws';
import { log } from './logger';

export interface Ticker {
  bid: number;
  ask: number;
}

export async function fetchMexcTicker(symbol: string): Promise<Ticker | undefined> {
  const url = `https://api.mexc.com/api/v3/ticker/bookTicker?symbol=${symbol}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      log('error', 'Erro ao buscar ticker da MEXC', { symbol, url, status: res.status, body });
      return undefined;
    }
    const data: any = await res.json();
    const bid = Number(data.bidPrice);
    const ask = Number(data.askPrice);
    if (isFinite(bid) && isFinite(ask)) return { bid, ask };
  } catch (err: any) {
    log('error', 'Erro ao buscar ticker da MEXC', { symbol, url, err: err.message });
  }
  return undefined;
}

const BTCC_WS_URL = 'wss://kapi1.btloginc.com:9082';
const BTCC_WS_NAME = process.env.BTCC_WS_NAME || '';
const BTCC_WS_KEY = process.env.BTCC_WS_KEY || '';
const CLIENT_TYPE = 1;

function normalizeSymbol(sym: string) {
  return sym.replace(/[^A-Z0-9]/gi, '').replace(/W$/i, '').toUpperCase();
}

type DictInfo = { SecID: number; ShortName: string; Digit?: number };

export async function fetchBtccTicker(
  symbol: string,
  opts?: { timeoutMs?: number }
): Promise<Ticker | undefined> {
  const timeoutMs = opts?.timeoutMs ?? 5000;
  const wanted = normalizeSymbol(symbol);

  const ws = new WebSocket(BTCC_WS_URL);

  let done = false;
  let timer: NodeJS.Timeout | undefined;
  let haveDict = false;
  let targetSecId: number | undefined;

  const finish = (ret?: Ticker) =>
    new Promise<Ticker | undefined>((resolve) => {
      if (done) return resolve(ret);
      done = true;
      if (timer) clearTimeout(timer);
      try {
        ws.close();
      } catch {}
      resolve(ret);
    });

  return new Promise<Ticker | undefined>((resolve) => {
    timer = setTimeout(() => {
      log('error', 'BTCC WS timeout ao obter ticker', { symbol: wanted, timeoutMs });
      finish(undefined).then(resolve);
    }, timeoutMs);

    ws.on('open', () => {
      if (BTCC_WS_NAME && BTCC_WS_KEY) {
        const login = { name: BTCC_WS_NAME, clienttype: CLIENT_TYPE, key: BTCC_WS_KEY };
        ws.send(JSON.stringify(login));
      }
    });

    ws.on('message', (raw: any) => {
      try {
        const msg = JSON.parse(String(raw));

        if (!haveDict && msg?.data?.DictInfo) {
          haveDict = true;
          const list: DictInfo[] = msg.data.DictInfo || [];
          const normalize = (s: string) => s.replace(/[^A-Z0-9]/gi, '').replace(/W$/i, '').toUpperCase();
          const found = list.find((d) => normalize(d.ShortName) === wanted);

          if (!found) {
            log('error', 'Símbolo não encontrado no dicionário BTCC', { symbol: wanted });
            finish(undefined).then(resolve);
            return;
          }

          targetSecId = found.SecID;

          const subMsg = {
            action: 'ReqSubcri',
            symbols: [String(targetSecId)],
            deep: String(targetSecId),
          };
          ws.send(JSON.stringify(subMsg));
          return;
        }

        if (
          (msg?.action === 'tickinfo' || msg?.action === 'tickinfo_deep') &&
          Array.isArray(msg.data) &&
          msg.data.length
        ) {
          const it = msg.data[0];
          const ask = Number(it?.A?.[0]);
          const bid = Number(it?.B?.[0]);

          if (isFinite(ask) && isFinite(bid)) {
            finish({ bid, ask }).then(resolve);
            return;
          }
        }
      } catch (err: any) {
        log('error', 'Erro ao processar mensagem da BTCC', { symbol: wanted, err: err?.message });
      }
    });

    ws.on('error', (err: any) => {
      log('error', 'Erro no socket da BTCC', { symbol: wanted, err: (err as any)?.message });
      finish(undefined).then(resolve);
    });

    ws.on('close', () => {
      finish(undefined).then(resolve);
    });
  });
}
