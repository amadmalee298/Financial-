import type Decimal from "decimal.js";
import type { TransactionType } from "./transaction";

/** Minimal transaction fields needed for portfolio math. */
export type LedgerTransaction = {
  id: string;
  transaction_type: TransactionType;
  trade_date: string;
  created_at: string;
  quantity: Decimal.Value;
  price: Decimal.Value;
  /** Cash paid (BUY, incl. costs) or received (SELL, net of costs). */
  total_amount: Decimal.Value;
};

/** One transaction replayed in order, with the position after it. */
export type LedgerEntry<T extends LedgerTransaction = LedgerTransaction> = {
  transaction: T;
  sharesAfter: Decimal;
  costBasisAfter: Decimal;
  avgCostAfter: Decimal;
  /** Cost of the shares sold (SELL only, otherwise 0). */
  costOfSold: Decimal;
  /** Realized P/L of this sale (SELL only, otherwise 0). */
  realizedPL: Decimal;
};

export type Position<T extends LedgerTransaction = LedgerTransaction> = {
  shares: Decimal;
  /** Remaining cost of the shares still held (includes buy costs). */
  costBasis: Decimal;
  /** costBasis / shares, or 0 when nothing is held. */
  avgCost: Decimal;
  realizedPL: Decimal;
  /** Σ total_amount of BUYs. */
  totalBought: Decimal;
  /** Σ total_amount of SELLs. */
  totalSold: Decimal;
  entries: LedgerEntry<T>[];
  /** First transaction that sold more shares than were held, if any. */
  oversold: T | null;
};

export type PriceSource = "manual" | "market" | "last_trade";

export type Holding = Position & {
  stockId: string;
  symbol: string;
  name: string | null;
  sector: string | null;
  price: Decimal;
  priceDate: string;
  priceSource: PriceSource;
  marketValue: Decimal;
  unrealizedPL: Decimal;
  /** unrealizedPL / costBasis, as a fraction (0.05 = 5%). */
  unrealizedPct: Decimal;
  dividends: Decimal;
  /** unrealized + realized + dividends. */
  totalReturn: Decimal;
  /** marketValue / portfolio market value, as a fraction. */
  weight: Decimal;
};

export type PortfolioSummary = {
  costBasis: Decimal;
  marketValue: Decimal;
  unrealizedPL: Decimal;
  unrealizedPct: Decimal;
  realizedPL: Decimal;
  dividends: Decimal;
  totalReturn: Decimal;
  totalBought: Decimal;
  holdingsCount: number;
};
