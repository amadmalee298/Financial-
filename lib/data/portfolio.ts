import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { buildHoldings, summarize, type PortfolioTransaction } from "@/lib/calculations/portfolio";
import { dividendsByStock } from "@/lib/calculations/dividend";
import { buildPerformance } from "@/lib/calculations/performance";
import { totalsByPeriod } from "@/lib/calculations/reports";
import { replayPosition } from "@/lib/calculations/profitLoss";
import { todayISO } from "@/lib/utils/date";
import { Decimal } from "@/lib/utils/decimal";

type Transaction = PortfolioTransaction & { commission: number; fees: number; vat: number };

/**
 * Raw portfolio data for the signed-in user. RLS scopes every query to the
 * current user. Cached per request so several components can share it.
 */
const getPortfolioData = cache(async () => {
  const supabase = await createClient();

  const [transactions, prices, dividends] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, stock_id, transaction_type, trade_date, created_at, quantity, price, total_amount, commission, fees, vat, stock:stocks!inner(symbol, name, sector)",
      )
      .returns<Transaction[]>(),
    supabase.from("manual_prices").select("stock_id, price, price_date"),
    supabase.from("dividends").select("stock_id, payment_date, xd_date, net_amount, gross_amount, withholding_tax"),
  ]);

  if (transactions.error || prices.error || dividends.error) {
    throw new Error("โหลดข้อมูลพอร์ตไม่สำเร็จ");
  }
  return { transactions: transactions.data, prices: prices.data, dividends: dividends.data };
});

/** Holdings and summary, computed with the average-cost method. */
export const getPortfolio = cache(async () => {
  const { transactions, prices, dividends } = await getPortfolioData();
  const byStock = dividendsByStock(dividends);
  const holdings = buildHoldings(transactions, prices, byStock);
  const held = new Set(holdings.map((h) => h.stockId));
  const otherDividends = [...byStock.entries()]
    .filter(([stockId]) => !held.has(stockId))
    .reduce((sum, [, amount]) => sum.plus(amount), new Decimal(0));
  return { holdings, summary: summarize(holdings, otherDividends) };
});

/** Value and cost over time, for the performance chart. */
export const getPerformance = cache(async () => {
  const supabase = await createClient();
  const [{ transactions, prices }, snapshots] = await Promise.all([
    getPortfolioData(),
    supabase.from("portfolio_snapshots").select("snapshot_date, market_value, cost_basis"),
  ]);
  return buildPerformance(transactions, prices, snapshots.data ?? [], todayISO());
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
 */
export async function recordSnapshot() {
  const { holdings, summary } = await getPortfolio();
  if (holdings.length === 0) return;

  const supabase = await createClient();
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

export type CurrentPrice = { price: Decimal; date: string; source: "manual" | "last_trade" };

/**
 * Best known current price per stock id: the holding's price for stocks the
 * user has traded, otherwise their manual price. Stocks with neither are absent.
 */
export const getCurrentPrices = cache(async () => {
  const [{ prices }, { holdings }] = await Promise.all([getPortfolioData(), getPortfolio()]);
  const result = new Map<string, CurrentPrice>();
  for (const p of prices) {
    result.set(p.stock_id, { price: new Decimal(p.price), date: p.price_date, source: "manual" });
  }
  for (const h of holdings) {
    result.set(h.stockId, { price: h.price, date: h.priceDate, source: h.priceSource });
  }
  return result;
});
