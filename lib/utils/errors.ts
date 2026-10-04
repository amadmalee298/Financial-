import { buildDigest } from "./error-digest";

type SupabaseLikeError = { code?: string; message?: string; details?: string; hint?: string };

export function describeError(error: unknown, depth = 0): string {
  if (error instanceof Error) {
    // Node's "fetch failed" hides the real reason (timeout, DNS, reset) in `cause`.
    const code = (error as Error & { code?: string }).code;
    const own = `${error.name}: ${error.message}${code ? ` [${code}]` : ""}`;
    const cause = (error as Error & { cause?: unknown }).cause;
    return cause && depth < 2 ? `${own} (cause: ${describeError(cause, depth + 1)})` : own;
  }
  if (error && typeof error === "object") {
    const { code, message, details, hint } = error as SupabaseLikeError;
    const text = [code, message, details, hint].filter(Boolean).join(" | ");
    if (text) return text;
  }
  return String(error);
}

/**
 * Error for a failed data load. In production Next.js hides the message of an
 * error thrown while rendering and shows only a digest, so:
 *  - the real cause is written to the server log first (Vercel → Logs); only the
 *    code, message, details and hint are logged: no keys, tokens or row data;
 *  - the error's digest is set to a short readable code (see buildDigest) such as
 *    "E-portfolio-PGRST205", which Next passes on to the error page, so the cause
 *    can be read straight off the screen.
 * `key` names the place that failed ("portfolio", "auth", ...).
 */
export function loadError(key: string, what: string, ...causes: unknown[]) {
  const reasons = causes.filter(Boolean).map((cause) => describeError(cause));
  console.error(`[load-error] ${key}: ${what}: ${reasons.join(" ; ") || "no detail"}`);
  return Object.assign(new Error(what), { digest: buildDigest(key, causes) });
}
