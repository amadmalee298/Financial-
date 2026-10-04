import { Decimal, toDecimal } from "@/lib/utils/decimal";
import type { PortfolioTransaction } from "./portfolio";
import { netDividend } from "./dividend";
import { replayPosition } from "./profitLoss";

export type PeriodTotals = {
  /** "2026" or "2026-03". */
  period: string;
  bought: Decimal;
  sold: Decimal;
  realizedPL: Decimal;
  dividends: Decimal;
  costs: Decimal;
};

type ReportTransaction = PortfolioTransaction & {
  commission: Decimal.Value;
  fees: Decimal.Value;
  vat: Decimal.Value;
};

type ReportDividend = {
  payment_date: string | null;
  xd_date: string | null;
  net_amount: Decimal.Value | null;
  gross_amount: Decimal.Value | null;
  withholding_tax: Decimal.Value | null;
};

const ZERO = new Decimal(0);

function empty(period: string): PeriodTotals {
  return { period, bought: ZERO, sold: ZERO, realizedPL: ZERO, dividends: ZERO, costs: ZERO };
}

/**
 * Totals per period. `keyLength` 4 groups by year, 7 by month (YYYY-MM).
 * Realized P/L is booked on the sell date; dividends on the payment date.
 */
export function totalsByPeriod(
  transactions: ReportTransaction[],
  dividends: ReportDividend[],
  keyLength: 4 | 7,
): PeriodTotals[] {
  const totals = new Map<string, PeriodTotals>();
  const at = (date: string) => {
    const key = date.slice(0, keyLength);
    if (!totals.has(key)) totals.set(key, empty(key));
    return totals.get(key)!;
  };

  const byStock = new Map<string, ReportTransaction[]>();
  for (const tx of transactions) byStock.set(tx.stock_id, [...(byStock.get(tx.stock_id) ?? []), tx]);

  for (const txs of byStock.values()) {
    for (const entry of replayPosition(txs).entries) {
      const tx = entry.transaction;
      const t = at(tx.trade_date);
      const amount = toDecimal(tx.total_amount);
      t.costs = t.costs.plus(toDecimal(tx.commission)).plus(toDecimal(tx.fees)).plus(toDecimal(tx.vat));
      if (tx.transaction_type === "BUY") t.bought = t.bought.plus(amount);
      else {
        t.sold = t.sold.plus(amount);
        t.realizedPL = t.realizedPL.plus(entry.realizedPL);
      }
    }
  }

  for (const d of dividends) {
    const date = d.payment_date ?? d.xd_date;
    if (!date) continue;
    const t = at(date);
    t.dividends = t.dividends.plus(netDividend(d));
  }

  return [...totals.values()].sort((a, b) => (a.period < b.period ? 1 : -1));
}
