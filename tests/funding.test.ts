import assert from "assert";
import { calcMetrics, evaluateOpportunity, FundingParams } from "../src/fundingUtils";
import { FundingRateSnapshot } from "../src/types";

// Test calcMetrics
const metrics = calcMetrics(0.0005, 8, 1000);
assert.strictEqual(metrics.fundingBps, 5);
assert.ok(Math.abs(metrics.pnlPorJanela - 0.5) < 1e-6);
assert.ok(Math.abs(metrics.pnlPorDia - 1.5) < 1e-6);
assert.ok(Math.abs(metrics.aprAprox - 0.5475) < 1e-6);

// Snapshots for further tests
const mexcSnap: FundingRateSnapshot = { exchange: "mexc", symbol: "BTC/USDT:USDT", rate: 0.0005, collectHours: 8 };
const gateSnapLow: FundingRateSnapshot = { exchange: "gate", symbol: "BTC/USDT:USDT", rate: 0.0001, collectHours: 8 };

const params: FundingParams = { notional: 1000, minBps: 2, safetyBps: 1 };

// Should publish (criteria met)
const opp = evaluateOpportunity("BTC_USDT", { mexc: mexcSnap, gate: gateSnapLow }, params);
assert.ok(opp, "opportunity should exist");
assert.deepStrictEqual(opp?.kind, "funding");
assert.ok(opp?.fundingBps && opp.fundingBps >= 5);

// Should not publish when funding below threshold
const lowRateSnap: FundingRateSnapshot = { exchange: "mexc", symbol: "BTC/USDT:USDT", rate: 0.0002, collectHours: 8 };
const oppLow = evaluateOpportunity("BTC_USDT", { mexc: lowRateSnap, gate: gateSnapLow }, params);
assert.strictEqual(oppLow, undefined);

// Should not publish when pnlPorDia <= buffer
const slowCollect: FundingRateSnapshot = { exchange: "mexc", symbol: "BTC/USDT:USDT", rate: 0.0003, collectHours: 72 };
const oppBuffer = evaluateOpportunity("BTC_USDT", { mexc: slowCollect, gate: gateSnapLow }, params);
assert.strictEqual(oppBuffer, undefined);

console.log("All funding tests passed");
