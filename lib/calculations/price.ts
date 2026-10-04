import { Decimal, toDecimal } from "@/lib/utils/decimal";
import type { PriceSource } from "@/types/portfolio";

export type PriceCandidate = { price: Decimal.Value; date: string; source: PriceSource };
export type CurrentPrice = { price: Decimal; date: string; source: PriceSource };

/** On the same day, prefer what the user typed, then the market, then a trade. */
const PRIORITY: Record<PriceSource, number> = { manual: 0, market: 1, last_trade: 2 };

/**
 * The best current price: the newest by date. A manual price therefore
 * overrides market data only until the market has a newer close.
 */
export function pickPrice(candidates: (PriceCandidate | null | undefined)[]): CurrentPrice | null {
  let best: PriceCandidate | null = null;
  for (const c of candidates) {
    if (!c) continue;
    if (!best || c.date > best.date || (c.date === best.date && PRIORITY[c.source] < PRIORITY[best.source])) best = c;
  }
  return best && { price: toDecimal(best.price), date: best.date, source: best.source };
}

/** Newest stored close per stock id, from rows in any order. */
export function latestClose(rows: { stock_id: string; price_date: string; close: Decimal.Value }[]) {
  const latest = new Map<string, { price: Decimal.Value; date: string; source: PriceSource }>();
  for (const row of rows) {
    const known = latest.get(row.stock_id);
    if (!known || row.price_date > known.date) {
      latest.set(row.stock_id, { price: row.close, date: row.price_date, source: "market" });
    }
  }
  return latest;
}
