import { describe, expect, it, vi } from "vitest";
import { fetchAllRows } from "./paginate";

/**
 * A fake table of `n` rows (0..n-1) that answers like PostgREST, including its
 * habit of failing with 416 / PGRST103 when a range starts past the last row
 * (the first range, from 0, is always fine, even for an empty table).
 */
function table(n: number, { count = true, failAt }: { count?: boolean; failAt?: number } = {}) {
  const calls: [number, number][] = [];
  const page = vi.fn(async (from: number, to: number) => {
    calls.push([from, to]);
    if (failAt === from) return { data: null, count: null, error: { code: "PGRST000" } };
    if (from > 0 && from >= n) {
      return { data: null, count: null, error: { code: "PGRST103", message: "Requested range not satisfiable" } };
    }
    const data = Array.from({ length: Math.max(0, Math.min(to, n - 1) - from + 1) }, (_, i) => from + i);
    return { data, count: count ? n : null, error: null };
  });
  return { page, calls };
}

describe("fetchAllRows", () => {
  it("needs one request when the result fits in a page, and never asks past the end", async () => {
    // 0 rows is a brand-new account; 324 is a small one. Both used to fail the dashboard.
    for (const n of [0, 1, 324, 999]) {
      const { page, calls } = table(n);
      expect(await fetchAllRows(page)).toEqual(Array.from({ length: n }, (_, i) => i));
      expect(calls).toEqual([[0, 999]]);
    }
  });

  it("stops after one request when the result is exactly one full page", async () => {
    const { page, calls } = table(1000);
    expect(await fetchAllRows(page)).toHaveLength(1000);
    expect(calls).toEqual([[0, 999]]);
  });

  it("fetches the remaining pages together, in order, with none missing, repeated or past the end", async () => {
    for (const n of [1001, 2000, 2001, 3500, 7000]) {
      const { page, calls } = table(n);
      const rows = await fetchAllRows(page);
      expect(rows).toEqual(Array.from({ length: n }, (_, i) => i));
      expect(calls).toHaveLength(Math.ceil(n / 1000));
      expect(calls.every(([from]) => from < n)).toBe(true);
    }
  });

  it("reads page by page when the total is unknown, and stops at a short page", async () => {
    const { page, calls } = table(2500, { count: false });
    expect(await fetchAllRows(page)).toEqual(Array.from({ length: 2500 }, (_, i) => i));
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("treats a later page that has gone past the end as empty (rows removed meanwhile)", async () => {
    let calls = 0;
    const page = vi.fn(async (from: number) => {
      calls++;
      if (from === 0) return { data: Array.from({ length: 1000 }, (_, i) => i), count: 2500, error: null };
      return { data: null, count: null, error: { code: "PGRST103" } };
    });
    expect(await fetchAllRows(page)).toHaveLength(1000);
    expect(calls).toBe(3);
  });

  it("fails on any other error, on any page", async () => {
    await expect(fetchAllRows(table(5000, { failAt: 0 }).page)).rejects.toThrow();
    await expect(fetchAllRows(table(5000, { failAt: 1000 }).page)).rejects.toThrow();
    await expect(fetchAllRows(table(5000, { failAt: 3000 }).page)).rejects.toThrow();
  });
});
