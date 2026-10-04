import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Find a stock by symbol, adding it to the shared list if it is new.
 * Returns null if it could not be found or created.
 */
export async function resolveStock(supabase: SupabaseClient<Database>, symbol: string, market = "SET") {
  const find = () =>
    supabase.from("stocks").select("id, symbol").eq("symbol", symbol).eq("market", market).maybeSingle();

  const existing = await find();
  if (existing.data) return existing.data;

  const inserted = await supabase.from("stocks").insert({ symbol, market }).select("id, symbol").single();
  if (inserted.data) return inserted.data;

  // Another request may have added it at the same moment.
  return (await find()).data;
}
