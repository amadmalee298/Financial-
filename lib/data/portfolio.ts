import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { buildHoldings, summarize, type PortfolioTransaction } from "@/lib/calculations/portfolio";
import { latestClose, pickPrice, type CurrentPrice } from "@/lib/calculations/price";
import { dividendsByStock } from "@/lib/calculations/dividend";
import { buildPerformance } from "@/lib/calculations/performance";
import { totalsByPeriod } from "@/lib/calculations/reports";
import { replayPosition } from "@/lib/calculations/profitLoss";
import { todayISO } from "@/lib/utils/date";
import { Decimal } from "@/lib/utils/decimal";
import { fetchAllRows } from "@/lib/utils/paginate";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { PortfolioSummary } from "@/types/portfolio";

type Transaction = PortfolioTransaction & { commission: number; fees: number; vat: number };

/** Market closes older than this many days are not used as a "current" price. */
const RECENT_PRICE_DAYS = 30;

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

/**
 * Stage 1: the signed-in user's own rows, all fetched together. RLS scopes
 * every query to the current user. Cached per request.
 */
const getUserRows = cache(async () => {
  const supabase = await createClient();

  const [transactions, prices, dividends, watchlist] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, stock_id, transaction_type, trade_date, created_at, quantity, price, total_amount, commission, fees, vat, stock:stocks!inner(symbol, name, sector)",
      )
      .returns<Transaction[]>(),
    supabase.from("manual_prices").select("stock_id, price, price_date"),
    supabase.from("dividends").select("stock_id, payment_date, xd_date, net_amount, gross_amount, withholding_tax"),
    supabase.from("watchlists").select("stock_id"),
  ]);

  if (transactions.error || prices.error || dividends.error || watchlist.error) {
    throw new Error("โหลดข้อมูลพอร์ตไม่สำเร็จ");
  }

  // Market prices are shared by everyone, so later queries ask only for the
  // stocks this user holds or watches.
  const stockIds = [...new Set([...transactions.data, ...watchlist.data].map((row) => row.stock_id))];
  return { transactions: transactions.data, prices: prices.data, dividends: dividends.data, stockIds };
});

/** Stage 2: the latest market close per stock (recent days only), once the stock ids are known. */
const getRecentMarket = cache(async () => {
  const { stockIds } = await getUserRows();
  if (stockIds.length === 0) return [];

  const supabase = await createClient();
  const recent = await supabase
    .from("stock_prices")
    .select("stock_id, price_date, close")
    .in("stock_id", stockIds)
    .gte("price_date", daysAgo(RECENT_PRICE_DAYS));
  if (recent.error) throw new Error("โหลดข้อมูลราคาไม่สำเร็จ");

  return [...latestClose(recent.data)].map(([stock_id, p]) => ({ stock_id, close: p.price, price_date: p.date }));
});

const getPortfolioData = cache(async () => {
  const [rows, market] = await Promise.all([getUserRows(), getRecentMarket()]);
  return { ...rows, market };
});

/** Holdings and summary, computed with the average-cost method. */
export const getPortfolio = cache(async () => {
  const { transactions, prices, dividends, market } = await getPortfolioData();
  const byStock = dividendsByStock(dividends);
  const holdings = buildHoldings(transactions, prices, byStock, market);
  const held = new Set(holdings.map((h) => h.stockId));
  const otherDividends = [...byStock.entries()]
    .filter(([stockId]) => !held.has(stockId))
    .reduce((sum, [, amount]) => sum.plus(amount), new Decimal(0));
  return { holdings, summary: summarize(holdings, otherDividends) };
});

/** Value and cost over time, for the performance chart. */
export const getPerformance = cache(async () => {
  const supabase = await createClient();
  // Snapshots do not depend on anything else, so ask for them straight away.
  // (Resolving the query builder is what sends the request.)
  const snapshots = Promise.resolve(
    supabase.from("portfolio_snapshots").select("snapshot_date, market_value, cost_basis"),
  );

  // Needs only stage 1, so it runs alongside getPortfolio's recent-price query.
  const { transactions, prices } = await getUserRows();
  const tradedIds = [...new Set(transactions.map((tx) => tx.stock_id))];

  const [closes, snapshotRows] = await Promise.all([
    tradedIds.length
      ? fetchAllRows((from, to) =>
          supabase
            .from("stock_prices")
            .select("stock_id, price_date, close", { count: "exact" })
            .in("stock_id", tradedIds)
            .order("price_date")
            .order("stock_id")
            .range(from, to),
        )
      : [],
    snapshots,
  ]);

  return buildPerformance(transactions, prices, snapshotRows.data ?? [], todayISO(), closes);
});

/** Yearly and monthly totals for the reports page. */
export const getReports = cache(async () => {
  const { transactions, dividends } = await getPortfolioData();
  return {
    years: totalsByPeriod(transactions, dividends, 4),
    months: totalsByPeriod(transactions, dividends, 7),
  };
});

/**
 * Record today's portfolio value so the performance chart builds a real
 * history over time (one row per user per day, overwritten on revisit).
 * Takes the client and summary as arguments so it can run in `after()`,
 * where cookies() is not available.
 */
export async function saveSnapshot(supabase: SupabaseClient<Database>, summary: PortfolioSummary) {
  try {
    await supabase.from("portfolio_snapshots").upsert(
      {
        snapshot_date: todayISO(),
        market_value: summary.marketValue.toFixed(2),
        cost_basis: summary.costBasis.toFixed(2),
        realized_pl: summary.realizedPL.toFixed(2),
        dividends: summary.dividends.toFixed(2),
      },
      { onConflict: "user_id,snapshot_date" },
    );
  } catch {
    // The chart still works without today's snapshot.
  }
}

/** Shares held after each trade date, per symbol (for dividend eligibility). */
export const getShareHistory = cache(async () => {
  const { transactions } = await getPortfolioData();
  const bySymbol = new Map<string, PortfolioTransaction[]>();
  for (const tx of transactions) bySymbol.set(tx.stock.symbol, [...(bySymbol.get(tx.stock.symbol) ?? []), tx]);

  const history: Record<string, { date: string; shares: string }[]> = {};
  for (const [symbol, txs] of bySymbol) {
    history[symbol] = replayPosition(txs).entries.map((e) => ({
      date: e.transaction.trade_date,
      shares: e.sharesAfter.toString(),
    }));
  }
  return history;
});

export type { CurrentPrice };

/**
 * Best known current price per stock id (newest of manual, market close and,
 * for traded stocks, the last trade). Stocks with none are absent.
 */
export const getCurrentPrices = cache(async () => {
  const [{ prices, market }, { holdings }] = await Promise.all([getPortfolioData(), getPortfolio()]);
  const result = new Map<string, CurrentPrice>();

  for (const m of market) {
    const price = pickPrice([
      { price: m.close, date: m.price_date, source: "market" },
      ...prices
        .filter((p) => p.stock_id === m.stock_id)
        .map((p) => ({ price: p.price, date: p.price_date, source: "manual" as const })),
    ]);
    if (price) result.set(m.stock_id, price);
  }
  for (const p of prices) {
    if (!result.has(p.stock_id)) {
      result.set(p.stock_id, { price: new Decimal(p.price), date: p.price_date, source: "manual" });
    }
  }
  // Traded stocks: the holding already weighed manual, market and last trade.
  for (const h of holdings) {
    result.set(h.stockId, { price: h.price, date: h.priceDate, source: h.priceSource });
  }
  return result;
});
