import type Decimal from "decimal.js";

/** "+12.34%" / "-4.10%" from a fraction (0.1234). */
export function formatPercent(fraction: Decimal, digits = 2) {
  const pct = fraction.times(100);
  return `${pct.isPositive() && !pct.isZero() ? "+" : ""}${pct.toFixed(digits)}%`;
}

/** Tailwind text color for a gain, loss or zero. */
export function plColor(value: Decimal) {
  if (value.isZero()) return "text-slate-500";
  return value.isPositive() ? "text-positive" : "text-negative";
}
