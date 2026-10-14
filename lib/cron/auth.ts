import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

/** True when the request carries `Authorization: Bearer $CRON_SECRET` (closed unless a secret is configured). */
export function cronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
