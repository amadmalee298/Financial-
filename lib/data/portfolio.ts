import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { buildHoldings, summarize, type PortfolioTransaction } from "@/lib/calculations/portfolio";
import { dividendsByStock } from "@/lib/calculations/dividend";

/**
 * Load the signed-in user's transactions, manual prices and dividends and
 * compute their holdings. RLS scopes every query to the current user.
 * Cached per request, so layout and page can both call it.
 */
export const getPortfolio = cache(async () => {
  const supabase = await createClient();

  const [transactions, prices, dividends] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, stock_id, transaction_type, trade_date, created_at, quantity, price, total_amount, stock:stocks!inner(symbol, name, sector)",
      )
      .returns<PortfolioTransaction[]>(),
    supabase.from("manual_prices").select("stock_id, price, price_date"),
    supabase.from("dividends").select("stock_id, net_amount, gross_amount, withholding_tax"),
  ]);

  if (transactions.error || prices.error || dividends.error) {
    throw new Error("โหลดข้อมูลพอร์ตไม่สำเร็จ");
  }

  const holdings = buildHoldings(transactions.data, prices.data, dividendsByStock(dividends.data));
  return { holdings, summary: summarize(holdings) };
});
