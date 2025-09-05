# Arbitrage PoC (MEXC + Gate.io) — Spot–Perp

**Objetivo:** observar basis (perp vs spot) e funding estimado para identificar oportunidades (sem enviar ordens).  
**Logs:** console (pino-pretty) e arquivo em `logs/app-YYYY-MM-DD.log`.  
**Persistência de oportunidades:** JSONL diário em `data/opportunities-YYYY-MM-DD.jsonl`.

## Requisitos
- Node.js >= 18.17
- Yarn (ou npm/pnpm)

## Instalação
```bash
yarn
cp .env.example .env
# ajuste taxas, thresholds e símbolos no .env
yarn dev
```

## Como funciona
- Para cada `SYMBOLS` (ex.: `BTC/USDT,ETH/USDT`):
  - Busca **spot ask** na exchange do lado "long spot" e **perp bid** na exchange do lado "short perp".
  - Calcula `basisPct = (perpBid - spotAsk)/spotAsk`.
  - Estima **custo de entrada** (taxas + slippage) e `netBasisPct = basisPct - custo`.
  - Tenta obter `fundingRate` por 8h via `fetchFundingRate`. Se indisponível, faz **heurística** com base no basis (conservadora).
  - Registra oportunidade se `netBasisPct >= MIN_BASIS_PCT` **ou** `fundingShort >= MIN_FUNDING_8H_PCT`.

## Saídas
- `logs/app-YYYY-MM-DD.log` — tudo que aparece no console também vai para arquivo.
- `data/opportunities-YYYY-MM-DD.jsonl` — cada linha é um JSON `Opportunity`.

## Observações
- A PoC usa somente **endpoints públicos** (não envia ordens). Coloque API keys se quiser aumentar *rate limits*.
- O **símbolo perp** é resolvido automaticamente (swap USDT-settled). Confira se sua conta tem acesso aos pares.
- Funding **varia** por exchange; o CCXT cobre boa parte, mas há **fallback** via heurística se não disponível.

## Próximos passos
- Adicionar **execução hedgeada** (IOC/FOK) com controle de margem.
- Medir **desvio vs. mark price** do perp (além do bid).
- Persistir em SQLite/Postgres para dashboards/time-series.
- Incluir **Perp–Perp** (long x short) para arbitrar funding cruzado.
