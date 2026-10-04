import { type NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/** Milliseconds taken by `task`. */
async function time(task: () => PromiseLike<unknown>) {
  const start = performance.now();
  await task();
  return Math.round(performance.now() - start);
}

/**
 * GET /api/speed        — no database; shows how long the function itself takes.
 * GET /api/speed?db=1   — also times trivial Supabase queries from the server.
 * Used by the speed check on the Settings page. Signed-in users only.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });

  // Set by Vercel (e.g. "sin1"); absent when running elsewhere.
  const region = process.env.VERCEL_REGION ?? "unknown";
  if (request.nextUrl.searchParams.get("db") !== "1") {
    return NextResponse.json({ region }, { headers: NO_STORE });
  }

  const supabase = await createClient();
  const query = () => supabase.from("stocks").select("id").limit(1);

  // One after another: the first includes opening the connection, the rest show the round trip.
  const dbMs: number[] = [];
  for (let i = 0; i < 4; i++) dbMs.push(await time(query));

  return NextResponse.json({ region, dbMs }, { headers: NO_STORE });
}
