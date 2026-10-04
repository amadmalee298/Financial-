import { Decimal, toDecimal } from "@/lib/utils/decimal";
import type { LedgerEntry } from "@/types/portfolio";
import type { ManualPrice, PortfolioTransaction } from "./portfolio";
import { replayPosition } from "./profitLoss";

export type MarketClose = { stock_id: string; price_date: string; close: Decimal.Value };

export type Snapshot = { snapshot_date: string; market_value: Decimal.Value; cost_basis: Decimal.Value };

export type PerformancePoint = {
  date: string;
  costBasis: Decimal;
  marketValue: Decimal;
  realizedPL: Decimal;
  /** True when marketValue was valued at last known trade/manual prices rather than recorded. */
  estimated: boolean;
};

const ZERO = new Decimal(0);

type PricePoint = { date: string; price: Decimal; kind: "trade" | "manual" | "market" };

/** Same-day tie-break, matching pickPrice: manual, then market, then trade. */
const PRIORITY = { manual: 0, market: 1, trade: 2 } as const;

/** Latest price point on or before `date`. */
function priceAt(points: PricePoint[], date: string) {
  let best: PricePoint | undefined;
  for (const p of points) {
    if (p.date > date) break;
    if (!best || p.date > best.date || (p.date === best.date && PRIORITY[p.kind] < PRIORITY[best.kind])) best = p;
  }
  return best;
}

/** A market close this recent counts as a real price for that date (covers weekends and holidays). */
const MARKET_STALE_DAYS = 7;

const daysBetween = (a: string, b: string) => (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000;

/**
 * Portfolio value over time, one point per trade date, snapshot date and today.
 *
 * Cost basis and realized P/L are exact (replayed from transactions). Market
 * value comes from a recorded snapshot when there is one for that date and
 * its cost basis still matches (a later back-dated entry makes it stale);
 * otherwise it is shares × the last known price for each stock on that date:
 * a stored market close when there is a recent one, else a trade or manual
 * price (flagged `estimated`).
 */
export function buildPerformance(
  transactions: PortfolioTransaction[],
  manualPrices: ManualPrice[],
  snapshots: Snapshot[],
  today: string,
  marketCloses: MarketClose[] = [],
): PerformancePoint[] {
  if (transactions.length === 0) return [];

  const byStock = new Map<string, PortfolioTransaction[]>();
  for (const tx of transactions) {
    byStock.set(tx.stock_id, [...(byStock.get(tx.stock_id) ?? []), tx]);
  }

  const closesByStock = new Map<string, MarketClose[]>();
  for (const c of marketCloses) closesByStock.set(c.stock_id, [...(closesByStock.get(c.stock_id) ?? []), c]);

  const stocks = [...byStock.entries()].map(([stockId, txs]) => {
    const { entries } = replayPosition(txs);
    const prices: PricePoint[] = entries.map((e) => ({
      date: e.transaction.trade_date,
      price: toDecimal(e.transaction.price),
      kind: "trade",
    }));
    const manual = manualPrices.find((p) => p.stock_id === stockId);
    if (manual) prices.push({ date: manual.price_date, price: toDecimal(manual.price), kind: "manual" });
    for (const c of closesByStock.get(stockId) ?? []) {
      prices.push({ date: c.price_date, price: toDecimal(c.close), kind: "market" });
    }
    prices.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return { entries, prices };
  });

  const snapshotByDate = new Map(snapshots.map((s) => [s.snapshot_date, s]));
  const firstTrade = transactions.reduce((min, tx) => (tx.trade_date < min ? tx.trade_date : min), today);
  const dates = new Set<string>([today, ...transactions.map((tx) => tx.trade_date)]);
  for (const date of snapshotByDate.keys()) if (date >= firstTrade && date <= today) dates.add(date);
  // Daily market closes of stocks the user has traded give the line its daily movement.
  for (const c of marketCloses) {
    if (byStock.has(c.stock_id) && c.price_date >= firstTrade && c.price_date <= today) dates.add(c.price_date);
  }

  return [...dates]
    .filter((d) => d <= today)
    .sort()
    .map((date) => {
      let costBasis = ZERO;
      let estimatedValue = ZERO;
      let realizedPL = ZERO;
      // True while every held stock is priced by a recent market close.
      let marketPriced = true;

      for (const { entries, prices } of stocks) {
        let last: LedgerEntry<PortfolioTransaction> | undefined;
        for (const e of entries) {
          if (e.transaction.trade_date > date) break;
          last = e;
          realizedPL = realizedPL.plus(e.realizedPL);
        }
        if (!last) continue;
        costBasis = costBasis.plus(last.costBasisAfter);
        if (last.sharesAfter.greaterThan(0)) {
          const point = priceAt(prices, date);
          estimatedValue = estimatedValue.plus(last.sharesAfter.times(point?.price ?? ZERO));
          if (point?.kind !== "market" || daysBetween(point.date, date) > MARKET_STALE_DAYS) marketPriced = false;
        }
      }

      const snapshot = date === today ? undefined : snapshotByDate.get(date);
      const recorded =
        snapshot && toDecimal(snapshot.cost_basis).minus(costBasis).abs().lessThan("0.01")
          ? toDecimal(snapshot.market_value)
          : undefined;
      return {
        date,
        costBasis,
        marketValue: recorded ?? estimatedValue,
        realizedPL,
        estimated: recorded === undefined && date !== today && !marketPriced,
      };
    });
}
