import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPriceProvider } from "./index";
import { UnknownSymbolError } from "./provider";
import { fetchFrom } from "./range";

export type RefreshTarget = {
  id: string;
  symbol: string;
  market: string;
  /** Earliest date prices are needed from (first trade date, or a recent default). */
  needFrom: string;
};

export type RefreshResult = {
  updated: string[];
  /** Skipped because they were refreshed recently. */
  fresh: string[];
  /** Symbols the provider does not know, or whose market it cannot quote. */
  unsupported: string[];
  /** Transient failures (network, rate limit); worth retrying later. */
  failed: string[];
};

/** Prices fetched within this window are not fetched again. */
export const FRESH_MINUTES = 10;
/** Upper bound per call, so one request cannot fan out without limit. */
export const MAX_SYMBOLS = 60;
const CONCURRENCY = 5;
/** Run `task` over `items` with at most `limit` in flight. */
async function mapLimit<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await task(items[i]);
      }
    }),
  );
  return results;
}

/**
 * Fetch and store daily closes for `targets`. Uses the service role client,
 * so callers must have authenticated whoever triggered it.
 */
export async function refreshPrices(targets: RefreshTarget[], { force = false } = {}): Promise<RefreshResult> {
  const result: RefreshResult = { updated: [], fresh: [], unsupported: [], failed: [] };
  if (targets.length === 0) return result;

  const provider = getPriceProvider();
  const admin = createAdminClient();
  const capped = targets.slice(0, MAX_SYMBOLS);
  result.failed.push(...targets.slice(MAX_SYMBOLS).map((t) => t.symbol));

  // Newest stored price (and when it was fetched) per stock.
  const { data: stored, error } = await admin
    .from("stock_prices")
    .select("stock_id, price_date, fetched_at")
    .in("stock_id", capped.map((t) => t.id))
    .order("price_date", { ascending: false })
    .limit(10_000);
  if (error) throw new Error("Could not read stored prices");

  const latest = new Map<string, { date: string; fetchedAt: number }>();
  for (const row of stored) {
    const fetchedAt = Date.parse(row.fetched_at);
    const known = latest.get(row.stock_id);
    if (!known) latest.set(row.stock_id, { date: row.price_date, fetchedAt });
    else known.fetchedAt = Math.max(known.fetchedAt, fetchedAt);
  }

  const cutoff = Date.now() - FRESH_MINUTES * 60_000;
  const toFetch: RefreshTarget[] = [];
  for (const target of capped) {
    if (!provider.supports(target.market)) result.unsupported.push(target.symbol);
    else if (!force && (latest.get(target.id)?.fetchedAt ?? 0) > cutoff) result.fresh.push(target.symbol);
    else toFetch.push(target);
  }

  await mapLimit(toFetch, CONCURRENCY, async (target) => {
    try {
      const closes = await provider.fetchDailyCloses({
        symbol: target.symbol,
        market: target.market,
        from: fetchFrom(target.needFrom, latest.get(target.id)?.date ?? null),
      });
      if (closes.length === 0) {
        result.failed.push(target.symbol);
        return;
      }
      const { error: upsertError } = await admin.from("stock_prices").upsert(
        closes.map((c) => ({
          stock_id: target.id,
          price_date: c.date,
          close: c.close,
          source: provider.name,
          fetched_at: new Date().toISOString(),
        })),
        { onConflict: "stock_id,price_date" },
      );
      if (upsertError) throw upsertError;
      result.updated.push(target.symbol);
    } catch (e) {
      (e instanceof UnknownSymbolError ? result.unsupported : result.failed).push(target.symbol);
    }
  });

  return result;
}
