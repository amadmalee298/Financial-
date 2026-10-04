/** One daily closing price. */
export type DailyClose = { date: string; close: string };

export type PriceRequest = {
  symbol: string;
  market: string;
  /** First day wanted (YYYY-MM-DD). */
  from: string;
};

/**
 * A market-data source. To switch sources, implement this interface and
 * register it in `lib/prices/index.ts`; nothing else in the app changes.
 */
export interface PriceProvider {
  /** Stored in stock_prices.source. */
  readonly name: string;
  /** Daily closes from `from` to today, oldest first. Throws on failure. */
  fetchDailyCloses(request: PriceRequest): Promise<DailyClose[]>;
  /** False for markets this provider cannot quote. */
  supports(market: string): boolean;
}

/** Thrown when the provider does not know the symbol (not a transient error). */
export class UnknownSymbolError extends Error {}
