import type Decimal from "decimal.js";

type Amount = number | string | Decimal;

const thb = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format an amount as Thai Baht, e.g. ฿485,250.00.
 * Formatting is display-only; do the math with Decimal first.
 */
export function formatTHB(amount: Amount) {
  return thb.format(Number(amount.toString()));
}

/** Plain number with grouping, e.g. 1,234.5 → "1,234.50". */
export function formatNumber(value: Amount, minDigits = 0, maxDigits = 4) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  }).format(Number(value.toString()));
}
