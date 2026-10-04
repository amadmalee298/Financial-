import { describeError } from "@/lib/utils/errors";

type FetchLike = typeof fetch;

type Options = {
  /** Give up on one attempt after this long (reads only). */
  timeoutMs?: number;
  /** Extra attempts after the first (reads only). */
  retries?: number;
  delayMs?: number;
  log?: (message: string) => void;
};

/** Gateway-style failures that are worth trying again; 4xx never is. */
const RETRYABLE_STATUS = new Set([502, 503, 504, 520, 521, 522, 523, 524]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function describe(input: Parameters<FetchLike>[0], init?: RequestInit) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase();
  // Path only: the query string can hold filters, and keys never appear in a URL.
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    /* relative URL: keep as is */
  }
  return { method, path };
}

/**
 * A fetch for calls to Supabase from the server. Reads (GET/HEAD) get a
 * timeout and one retry on a network error, a timeout or a gateway error, so a
 * hiccup between the web server and the database does not become an error
 * page. Writes are never retried or cut short: repeating or abandoning one
 * could change data twice or report a failure for something that succeeded.
 * Every retry and final failure is logged with its cause.
 */
export function makeResilientFetch(
  base: FetchLike = fetch,
  { timeoutMs = 4000, retries = 1, delayMs = 250, log = (m) => console.warn(m) }: Options = {},
): FetchLike {
  return async (input, init) => {
    const { method, path } = describe(input, init);
    const isRead = method === "GET" || method === "HEAD";
    if (!isRead) return base(input, init);

    const attempts = retries + 1;
    for (let attempt = 1; ; attempt++) {
      const last = attempt >= attempts;
      const signals = [AbortSignal.timeout(timeoutMs), ...(init?.signal ? [init.signal] : [])];
      try {
        const response = await base(input, { ...init, signal: AbortSignal.any(signals) });
        if (!last && RETRYABLE_STATUS.has(response.status)) {
          log(`[supabase] ${method} ${path} → ${response.status} (attempt ${attempt}/${attempts}), retrying`);
          await sleep(delayMs);
          continue;
        }
        if (RETRYABLE_STATUS.has(response.status)) log(`[supabase] ${method} ${path} → ${response.status}, giving up`);
        return response;
      } catch (error) {
        // The caller cancelled it: not our failure to retry.
        if (init?.signal?.aborted) throw error;
        const reason = describeError(error);
        log(`[supabase] ${method} ${path} failed (attempt ${attempt}/${attempts}): ${reason}${last ? ", giving up" : ", retrying"}`);
        if (last) throw error;
        await sleep(delayMs);
      }
    }
  };
}

/** The shared instance used by the server client. */
export const resilientFetch = makeResilientFetch();
