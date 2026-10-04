import { Decimal, toDecimal } from "@/lib/utils/decimal";
import type { LedgerEntry, LedgerTransaction, Position } from "@/types/portfolio";

const ZERO = new Decimal(0);

/** Safe ratio: returns 0 when the denominator is 0. */
export function ratio(numerator: Decimal, denominator: Decimal) {
  return denominator.isZero() ? ZERO : numerator.div(denominator);
}

/**
 * Order transactions the way they happened: by trade date, BUYs before SELLs
 * on the same day (so day trades work), then by entry time.
 */
export function compareTransactions(a: LedgerTransaction, b: LedgerTransaction) {
  if (a.trade_date !== b.trade_date) return a.trade_date < b.trade_date ? -1 : 1;
  if (a.transaction_type !== b.transaction_type) return a.transaction_type === "BUY" ? -1 : 1;
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Replay one stock's transactions with the average-cost method.
 *
 *   BUY : shares += qty, cost += total paid (price × qty + costs)
 *   SELL: costOfSold = avgCost × qty
 *         realized  += net proceeds − costOfSold
 *         cost      -= costOfSold, shares -= qty
 */
export function replayPosition<T extends LedgerTransaction>(transactions: T[]): Position<T> {
  let shares = ZERO;
  let costBasis = ZERO;
  let realizedPL = ZERO;
  let totalBought = ZERO;
  let totalSold = ZERO;
  let oversold: T | null = null;
  const entries: LedgerEntry<T>[] = [];

  for (const tx of [...transactions].sort(compareTransactions)) {
    const quantity = toDecimal(tx.quantity);
    const amount = toDecimal(tx.total_amount);
    let costOfSold = ZERO;
    let realized = ZERO;

    if (tx.transaction_type === "BUY") {
      shares = shares.plus(quantity);
      costBasis = costBasis.plus(amount);
      totalBought = totalBought.plus(amount);
    } else {
      if (quantity.greaterThan(shares) && !oversold) oversold = tx;
      // Never take more cost out than is left (guards against oversold data).
      const sold = Decimal.min(quantity, shares);
      costOfSold = sold.isZero() ? ZERO : costBasis.times(sold).div(shares);
      realized = amount.minus(costOfSold);
      shares = shares.minus(sold);
      costBasis = shares.isZero() ? ZERO : costBasis.minus(costOfSold);
      realizedPL = realizedPL.plus(realized);
      totalSold = totalSold.plus(amount);
    }

    entries.push({
      transaction: tx,
      sharesAfter: shares,
      costBasisAfter: costBasis,
      avgCostAfter: ratio(costBasis, shares),
      costOfSold,
      realizedPL: realized,
    });
  }

  return {
    shares,
    costBasis,
    avgCost: ratio(costBasis, shares),
    realizedPL,
    totalBought,
    totalSold,
    entries,
    oversold,
  };
}

/** Market value and unrealized P/L of a position at a given price. */
export function unrealized(position: Pick<Position, "shares" | "costBasis">, price: Decimal.Value) {
  const marketValue = position.shares.times(toDecimal(price));
  const unrealizedPL = marketValue.minus(position.costBasis);
  return { marketValue, unrealizedPL, unrealizedPct: ratio(unrealizedPL, position.costBasis) };
}
