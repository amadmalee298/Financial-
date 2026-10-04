const thb = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format an amount as Thai Baht, e.g. ฿485,250.00.
 * Accepts strings so values from Postgres `numeric` columns can be passed
 * through without first being converted to floating point elsewhere.
 */
export function formatTHB(amount: number | string) {
  return thb.format(Number(amount));
}
