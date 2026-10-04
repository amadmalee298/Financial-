import { Decimal, toDecimal } from "@/lib/utils/decimal";
import type { LedgerEntry } from "@/types/portfolio";
import type { ManualPrice, PortfolioTransaction } from "./portfolio";
import { replayPosition } from "./profitLoss";

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

type PricePoint = { date: string; price: Decimal; manual: boolean };

/** Latest price on or before `date`; a manual price wins a same-day tie. */
function priceAt(points: PricePoint[], date: string) {
  let best: PricePoint | undefined;
  for (const p of points) {
    if (p.date > date) break;
    if (!best || p.date > best.date || p.manual) best = p;
  }
  return best?.price ?? ZERO;
}

/**
 * Portfolio value over time, one point per trade date, snapshot date and today.
 *
 * Cost basis and realized P/L are exact (replayed from transactions). Market
 * value comes from a recorded snapshot when there is one for that date and
 * its cost basis still matches (a later back-dated entry makes it stale);
 * otherwise it is estimated as shares × the last known price for each stock
 * (trade price or manual price) on that date. Historical market prices arrive
 * with Phase 6.
 */
export function buildPerformance(
  transactions: PortfolioTransaction[],
  manualPrices: ManualPrice[],
  snapshots: Snapshot[],
  today: string,
): PerformancePoint[] {
  if (transactions.length === 0) return [];

  const byStock = new Map<string, PortfolioTransaction[]>();
  for (const tx of transactions) {
    byStock.set(tx.stock_id, [...(byStock.get(tx.stock_id) ?? []), tx]);
  }

  const stocks = [...byStock.entries()].map(([stockId, txs]) => {
    const { entries } = replayPosition(txs);
    const prices: PricePoint[] = entries.map((e) => ({
      date: e.transaction.trade_date,
      price: toDecimal(e.transaction.price),
      manual: false,
    }));
    const manual = manualPrices.find((p) => p.stock_id === stockId);
    if (manual) prices.push({ date: manual.price_date, price: toDecimal(manual.price), manual: true });
    prices.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return { entries, prices };
  });

  const snapshotByDate = new Map(snapshots.map((s) => [s.snapshot_date, s]));
  const firstTrade = transactions.reduce((min, tx) => (tx.trade_date < min ? tx.trade_date : min), today);
  const dates = new Set<string>([today, ...transactions.map((tx) => tx.trade_date)]);
  for (const date of snapshotByDate.keys()) if (date >= firstTrade && date <= today) dates.add(date);

  return [...dates]
    .filter((d) => d <= today)
    .sort()
    .map((date) => {
      let costBasis = ZERO;
      let estimatedValue = ZERO;
      let realizedPL = ZERO;

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
          estimatedValue = estimatedValue.plus(last.sharesAfter.times(priceAt(prices, date)));
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
        estimated: recorded === undefined && date !== today,
      };
    });
}
