import assert from 'assert';
import { computeNetSpread } from '../src/marginUtils';

const { spreadPct, estEntryCostPct, netSpreadPct } = computeNetSpread(100, 102, 0.001, 0.001, 0.0005);
assert.ok(Math.abs(spreadPct - 0.02) < 1e-6);
assert.ok(Math.abs(estEntryCostPct - 0.003) < 1e-6);
assert.ok(Math.abs(netSpreadPct - 0.017) < 1e-6);

console.log('All margin tests passed');
