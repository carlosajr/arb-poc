import { MarginArbScanner } from './marginScanner';
import { log } from './logger';
import { startLogServer } from './server';

async function main() {
  log('info', 'Iniciando aplicação', {});
  startLogServer();
  const scanner = new MarginArbScanner();
  await scanner.start();
}

main().catch(err => {
  log('error', 'Fatal init error', { err: String(err) });
  process.exit(1);
});
