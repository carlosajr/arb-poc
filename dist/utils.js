"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pct = pct;
exports.safeNumber = safeNumber;
function pct(n) {
    return `${(n * 100).toFixed(3)}%`;
}
function safeNumber(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : undefined;
}
