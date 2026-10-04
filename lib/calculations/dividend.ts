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
