import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { todayISO } from "@/lib/utils/date";
import type { RefreshTarget } from "./refresh";

const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

type StockRow = { id: string; symbol: string; market: string };

/**
 * Stocks to refresh, from transactions and watchlists visible to `supabase`
 * (the signed-in user's RLS client, or the admin client for every user).
 * Traded stocks are fetched back to their first trade; watched-only stocks
 * just need recent prices.
 */
export async function getRefreshTargets(supabase: SupabaseClient<Database>): Promise<RefreshTarget[]> {
  const [transactions, watchlist] = await Promise.all([
    supabase
      .from("transactions")
      .select("stock_id, trade_date, stock:stocks!inner(id, symbol, market)")
      .order("trade_date")
      .limit(50_000)
      .returns<{ stock_id: string; trade_date: string; stock: StockRow }[]>(),
    supabase
      .from("watchlists")
      .select("stock_id, stock:stocks!inner(id, symbol, market)")
      .returns<{ stock_id: string; stock: StockRow }[]>(),
  ]);
  if (transactions.error || watchlist.error) throw new Error("Could not load stocks to refresh");

  const recent = addDays(todayISO(), -30);
  const targets = new Map<string, RefreshTarget>();

  // Ordered by date, so the first row per stock is its first trade.
  for (const tx of transactions.data) {
    if (!targets.has(tx.stock_id)) {
      targets.set(tx.stock_id, { ...tx.stock, needFrom: tx.trade_date });
    }
  }
  for (const row of watchlist.data) {
    if (!targets.has(row.stock_id)) targets.set(row.stock_id, { ...row.stock, needFrom: recent });
  }
  return [...targets.values()].sort((a, b) => a.symbol.localeCompare(b.symbol));
}
