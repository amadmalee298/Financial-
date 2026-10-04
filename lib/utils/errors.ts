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
 * error thrown while rendering and shows only a numeric digest, so the real
 * cause is written to the server log first (Vercel → Logs) and then a generic
 * error is thrown. Only the code, message, details and hint are logged: no
 * keys, tokens or row data.
 */
export function loadError(what: string, ...causes: unknown[]) {
  const reasons = causes.filter(Boolean).map(describeError);
  console.error(`[load-error] ${what}: ${reasons.join(" ; ") || "no detail"}`);
  return new Error(what);
}
