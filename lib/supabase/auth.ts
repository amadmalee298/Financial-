import "server-only";
import { cache } from "react";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { loadError } from "@/lib/utils/errors";
import { createClient } from "./server";

/**
 * The signed-in user, read from the verified JWT claims. With Supabase's
 * asymmetric signing keys this checks the signature locally (the public keys
 * are cached), so it costs no round trip to Supabase Auth; with the older
 * shared-secret keys supabase-js falls back to asking the Auth server.
 *
 * Returns null only when there is genuinely no signed-in user. Cached per request. Use `supabase.auth.getUser()` instead where you need
 * the full user record (e.g. created_at) or the strictest check.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();

  for (let attempt = 1; ; attempt++) {
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (claims?.sub) return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };

    // No session at all: signed out. A failed check (e.g. the signing keys could not
    // be fetched for a moment) says nothing about the user, so try again, and if it
    // still fails show the error page rather than silently signing them out.
    if (!isAuthRetryableFetchError(error)) return null;
    if (attempt >= 2) throw loadError("auth", "ตรวจสอบการเข้าสู่ระบบไม่สำเร็จ", error);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
});
