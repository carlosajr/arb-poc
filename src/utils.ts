export function pct(n: number): string {
  return `${(n * 100).toFixed(3)}%`;
}

export function safeNumber(x: any): number | undefined {
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
}
