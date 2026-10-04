import { timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshPrices } from "@/lib/prices/refresh";
import { getRefreshTargets } from "@/lib/prices/targets";

export const maxDuration = 60;

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // closed unless a secret is configured
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/**
 * GET /api/cron/prices — refresh prices for every stock any user holds or
 * watches. Call it from a scheduler with `Authorization: Bearer $CRON_SECRET`
 * (Vercel Cron sends this header automatically when CRON_SECRET is set).
 */
export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const targets = await getRefreshTargets(createAdminClient());
    const result = await refreshPrices(targets);
    return NextResponse.json({
      updated: result.updated.length,
      fresh: result.fresh.length,
      unsupported: result.unsupported,
      failed: result.failed,
    });
  } catch {
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}
