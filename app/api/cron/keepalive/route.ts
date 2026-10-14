import { type NextRequest, NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/cron/keepalive — one tiny database query per day, so a free
 * Supabase project is never idle long enough to be paused. Called by Vercel
 * Cron (see vercel.json), which sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await createAdminClient().from("stocks").select("id").limit(1);
  if (error) return NextResponse.json({ error: "Database unreachable" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
