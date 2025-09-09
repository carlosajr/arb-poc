export interface Opportunity {
  ts: number;
  symbol: string;
  buyExchange: 'mexc' | 'btcc';
  sellExchange: 'mexc' | 'btcc';
  buyPrice: number;
  sellPrice: number;
  spreadPct: number;
  estEntryCostPct: number;
  netSpreadPct: number;
}
