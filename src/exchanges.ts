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

const BTCC_WS_URL = (process.env.BTCC_WS_URL ?? 'wss://kapi1.btloginc.com:9082/') as string;
const BTCC_WS_NAME = process.env.BTCC_WS_NAME || '';
const BTCC_WS_KEY = process.env.BTCC_WS_KEY || '';
const CLIENT_TYPE = 1;

let btccBackoffUntil = 0;
export function btccWsBackoffActive() {
  return Date.now() < btccBackoffUntil;
}

function normalizeSymbol(sym: string) {
  return sym.replace(/[^A-Z0-9]/gi, '').replace(/W$/i, '').toUpperCase();
}

type DictInfo = { SecID: number; ShortName: string; Digit?: number };

export async function fetchBtccTicker(
  symbol: string,
  opts?: { timeoutMs?: number }
): Promise<Ticker | undefined> {
  const timeoutMs = opts?.timeoutMs ?? 7000;
  const wanted = normalizeSymbol(symbol);

  if (!BTCC_WS_NAME || !BTCC_WS_KEY) {
    log('warn', 'BTCC WS sem credenciais (BTCC_WS_NAME/BTCC_WS_KEY).', { symbol });
    return undefined;
  }

  if (btccWsBackoffActive()) {
    log('warn', 'BTCC WS em backoff', { symbol, nextTry: new Date(btccBackoffUntil).toISOString() });
    return undefined;
  }

  const connect = (url: string) =>
    new WebSocket(url, {
      headers: {
        Origin: 'https://www.btcc.com',
        'User-Agent': 'Mozilla/5.0',
      },
      perMessageDeflate: false,
      handshakeTimeout: timeoutMs,
    });

  let ws: any;
  let timer: NodeJS.Timeout | undefined;
  let keepalive: NodeJS.Timeout | undefined;
  let haveDict = false;
  let targetSecId: number | undefined;
  let finished = false;

  const finish = (ret?: Ticker) =>
    new Promise<Ticker | undefined>((resolve) => {
      if (finished) return resolve(ret);
      finished = true;
      if (timer) clearTimeout(timer);
      if (keepalive) clearInterval(keepalive);
      try {
        ws.close();
      } catch {}
      resolve(ret);
    });

  return new Promise<Ticker | undefined>((resolve) => {
    const setup = (url: string, allowFallback = true) => {
      ws = connect(url);

      ws.on('unexpected-response', (_req: any, res: any) => {
        let body = '';
        res.on('data', (c: Buffer) => (body += c.toString('utf8')));
        res.on('end', () => {
          const status = res?.statusCode;
          log('error', 'BTCC WS unexpected-response', {
            statusCode: status,
            headers: res?.headers,
            body: body?.slice(0, 500),
            btcc_handshake_status: status,
          });
          if (status === 403 || status === 404) {
            btccBackoffUntil = Date.now() + 30000;
          }

          if (
            allowFallback &&
            process.env.BTCC_WS_ALLOW_INSECURE === '1' &&
            url.startsWith('wss://')
          ) {
            try {
              ws.terminate();
            } catch {}
            const insecure = url.replace('wss://', 'ws://');
            log('warn', 'BTCC WS fallback DEV para ws:// habilitado', { insecure });
            setup(insecure, false);
          } else {
            finish(undefined).then(resolve);
          }
        });
      });

      (ws as any).on('upgrade', (res: any) => {
        log('info', 'BTCC WS upgrade ok', {
          statusCode: res?.statusCode,
          server: res?.headers?.server,
        });
      });

      ws.on('open', () => {
        ws.send(
          JSON.stringify({ name: BTCC_WS_NAME, clienttype: CLIENT_TYPE, key: BTCC_WS_KEY })
        );
        keepalive = setInterval(() => {
          try {
            ws.send(JSON.stringify({ action: 'KeepLive' }));
          } catch {}
        }, 20000);
      });

      ws.on('message', (raw: any) => {
        try {
          const msg = JSON.parse(String(raw));

          if (!haveDict && msg?.data?.DictInfo) {
            haveDict = true;
            const list: DictInfo[] = msg.data.DictInfo || [];
            const norm = (s: string) =>
              s.replace(/[^A-Z0-9]/gi, '').replace(/W$/i, '').toUpperCase();
            const found = list.find((d) => norm(d.ShortName) === wanted);
            if (!found) {
              log('error', 'symbol_not_found_in_dict', { wanted });
              finish(undefined).then(resolve);
              return;
            }
            targetSecId = found.SecID;
            ws.send(
              JSON.stringify({
                action: 'ReqSubcri',
                symbols: [String(targetSecId)],
                deep: String(targetSecId),
              })
            );
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
            }
          }
        } catch (err: any) {
          log('error', 'Erro ao processar mensagem da BTCC', {
            symbol: wanted,
            err: err?.message,
          });
        }
      });

      ws.on('error', (err: any) => {
        const msg = (err as any)?.message || '';
        if (/403|404/.test(msg)) {
          btccBackoffUntil = Date.now() + 30000;
          log('error', 'BTCC WS handshake erro', {
            symbol: wanted,
            err: msg,
            btcc_handshake_status: msg,
          });
        } else {
          log('error', 'Erro no socket da BTCC', { symbol: wanted, err: msg });
        }
        finish(undefined).then(resolve);
      });

      ws.on('close', () => {
        finish(undefined).then(resolve);
      });
    };

    timer = setTimeout(() => {
      log('error', 'BTCC WS timeout ao obter ticker', { symbol: wanted, timeoutMs });
      finish(undefined).then(resolve);
    }, timeoutMs + 500);

    setup(BTCC_WS_URL);
  });
}
