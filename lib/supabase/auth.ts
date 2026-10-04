import "server-only";
import { cache } from "react";
import { createClient } from "./server";

/**
 * The signed-in user, read from the verified JWT claims. With Supabase's
 * asymmetric signing keys this checks the signature locally (the public keys
 * are cached), so it costs no round trip to Supabase Auth; with the older
 * shared-secret keys supabase-js falls back to asking the Auth server.
 *
 * Cached per request. Use `supabase.auth.getUser()` instead where you need
 * the full user record (e.g. created_at) or the strictest check.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
});
