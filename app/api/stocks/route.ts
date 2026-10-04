import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /api/stocks?q=pt — search stocks by symbol or name (max 20). */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Strip characters that have meaning in PostgREST filter syntax.
  const q = (request.nextUrl.searchParams.get("q") ?? "").replace(/[^\p{L}\p{N} .&-]/gu, "").trim();

  let query = supabase.from("stocks").select("id, symbol, name, market, sector").order("symbol").limit(20);
  if (q) query = query.or(`symbol.ilike.${q}%,name.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Failed to load stocks" }, { status: 500 });
  return NextResponse.json(data);
}
