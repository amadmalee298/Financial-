import { Decimal, toDecimal } from "@/lib/utils/decimal";

type DividendRow = {
  stock_id: string;
  net_amount: Decimal.Value | null;
  gross_amount: Decimal.Value | null;
  withholding_tax: Decimal.Value | null;
};

/** Net dividend received: net_amount, or gross − withholding tax. */
export function netDividend(row: Omit<DividendRow, "stock_id">) {
  if (row.net_amount !== null && row.net_amount !== undefined) return toDecimal(row.net_amount);
  return toDecimal(row.gross_amount).minus(toDecimal(row.withholding_tax));
}

/** Σ net dividends per stock_id. */
export function dividendsByStock(rows: DividendRow[]) {
  const totals = new Map<string, Decimal>();
  for (const row of rows) {
    totals.set(row.stock_id, (totals.get(row.stock_id) ?? new Decimal(0)).plus(netDividend(row)));
  }
  return totals;
}

/** Withholding tax on Thai listed-company dividends. */
export const DEFAULT_WITHHOLDING_RATE = "0.10";

/**
 * gross = shares × dividend per share; tax = gross × rate (both rounded to
 * satang, unless `withholdingTax` is given); net = gross − tax.
 */
export function dividendAmounts({
  shares,
  dividendPerShare,
  withholdingTax,
  withholdingRate = DEFAULT_WITHHOLDING_RATE,
}: {
  shares: Decimal.Value;
  dividendPerShare: Decimal.Value;
  withholdingTax?: Decimal.Value | null;
  withholdingRate?: Decimal.Value;
}) {
  const gross = toDecimal(shares).times(toDecimal(dividendPerShare)).toDecimalPlaces(2);
  const tax =
    withholdingTax !== undefined && withholdingTax !== null && withholdingTax !== ""
      ? toDecimal(withholdingTax)
      : gross.times(toDecimal(withholdingRate)).toDecimalPlaces(2);
  return { gross, withholdingTax: tax, net: gross.minus(tax) };
}

/**
 * Shares held at the close of the day before `xdDate` — the shares that
 * qualify for a dividend with that XD date.
 */
export function sharesEligible(
  entries: { transaction: { trade_date: string }; sharesAfter: Decimal }[],
  xdDate: string,
) {
  let shares = new Decimal(0);
  for (const entry of entries) {
    if (entry.transaction.trade_date >= xdDate) break;
    shares = entry.sharesAfter;
  }
  return shares;
}
