# Arbitrage PoC (MEXC + BTCC)

Scanner de arbitragem de margem entre as exchanges **MEXC** e **BTCC**. O projeto apenas
observa preços e taxas de funding; não envia ordens.

## Requisitos

- Node.js >= 18
- Yarn ou npm

## Instalação

```bash
yarn
cp .env.example .env
# ajuste taxas, símbolos e credenciais no .env
yarn dev
```

## Como funciona

Para cada símbolo configurado (`SYMBOLS`), o scanner coleta o topo do book nas duas
exchanges, calcula o spread líquido (considerando taxas e slippage) e registra
oportunidades quando o spread mínimo é atingido. Os logs são gravados em `logs/app.log` e
também servidos via HTTP pelo servidor embutido.

### BTCC WebSocket

- A conexão WebSocket deve incluir `Origin: https://www.btcc.com` e um `User-Agent` de
  navegador.
- É obrigatório fornecer as variáveis `BTCC_WS_NAME` e `BTCC_WS_KEY`.
- As API keys da BTCC podem ter **IP binding**; verifique se o IP do servidor está na
  whitelist caso receba respostas 403.

## Logs

Um servidor Express expõe o conteúdo da pasta `logs`. Acesse `http://localhost:3000/`
para listar os arquivos de log e visualizar seu conteúdo no navegador.

## Avisos

Esta PoC utiliza apenas endpoints públicos e serve apenas para fins de estudo. Não há
execução de ordens ou chamadas privadas.

