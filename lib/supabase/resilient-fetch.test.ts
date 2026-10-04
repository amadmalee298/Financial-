import { describe, expect, it, vi } from "vitest";
import { makeResilientFetch } from "./resilient-fetch";

const ok = () => new Response("[]", { status: 200 });
const url = "https://x.supabase.co/rest/v1/transactions?select=*&user=eq.secret";
const opts = { delayMs: 0, timeoutMs: 30, log: vi.fn() };
const make = (base: typeof fetch) => makeResilientFetch(base, { ...opts, log: vi.fn() });

describe("makeResilientFetch (reads)", () => {
  it("passes a good response straight through, once", async () => {
    const base = vi.fn(async () => ok());
    const response = await make(base as unknown as typeof fetch)(url);
    expect(response.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(1);
  });

  it("retries once after a network error and returns the second answer", async () => {
    const base = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(ok());
    expect((await make(base as unknown as typeof fetch)(url)).status).toBe(200);
    expect(base).toHaveBeenCalledTimes(2);
  });

  it("retries once on a gateway error", async () => {
    for (const status of [502, 503, 504, 522]) {
      const base = vi.fn().mockResolvedValueOnce(new Response("", { status })).mockResolvedValueOnce(ok());
      expect((await make(base as unknown as typeof fetch)(url)).status).toBe(200);
      expect(base).toHaveBeenCalledTimes(2);
    }
  });

  it("gives up after the retry: rethrows an error, or returns the last bad response", async () => {
    const failing = vi.fn(async () => { throw new TypeError("fetch failed"); });
    await expect(make(failing as unknown as typeof fetch)(url)).rejects.toThrow("fetch failed");
    expect(failing).toHaveBeenCalledTimes(2);

    const busy = vi.fn(async () => new Response("", { status: 503 }));
    expect((await make(busy as unknown as typeof fetch)(url)).status).toBe(503);
    expect(busy).toHaveBeenCalledTimes(2);
  });

  it("never retries a client error", async () => {
    for (const status of [400, 401, 403, 404, 406]) {
      const base = vi.fn(async () => new Response("", { status }));
      expect((await make(base as unknown as typeof fetch)(url)).status).toBe(status);
      expect(base).toHaveBeenCalledTimes(1);
    }
  });

  it("cuts a hanging request short and retries it", async () => {
    let calls = 0;
    const base = vi.fn((_input: unknown, init?: RequestInit) => {
      calls++;
      if (calls > 1) return Promise.resolve(ok());
      return new Promise<Response>((_, reject) => init!.signal!.addEventListener("abort", () => reject(init!.signal!.reason)));
    });
    expect((await make(base as unknown as typeof fetch)(url)).status).toBe(200);
    expect(calls).toBe(2);
  });

  it("does not retry a request the caller cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    const base = vi.fn(async (_input: unknown, init?: RequestInit) => { init!.signal!.throwIfAborted(); return ok(); });
    await expect(make(base as unknown as typeof fetch)(url, { signal: controller.signal })).rejects.toBeTruthy();
    expect(base).toHaveBeenCalledTimes(1);
  });

  it("logs the path and cause but never the query string", async () => {
    const log = vi.fn();
    const base = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(ok());
    await makeResilientFetch(base as unknown as typeof fetch, { delayMs: 0, log })(url);
    const text = log.mock.calls.map((c) => c[0]).join("\n");
    expect(text).toContain("/rest/v1/transactions");
    expect(text).toContain("fetch failed");
    expect(text).not.toContain("secret");
    expect(text).not.toContain("select=");
  });
});

describe("makeResilientFetch (writes)", () => {
  it("sends a write once, untouched: no retry and no timeout", async () => {
    const base = vi.fn(async (_input: unknown, init?: RequestInit) => { expect(init?.signal).toBeUndefined(); throw new TypeError("fetch failed"); });
    await expect(make(base as unknown as typeof fetch)(url, { method: "POST", body: "{}" })).rejects.toThrow("fetch failed");
    expect(base).toHaveBeenCalledTimes(1);
  });
});
