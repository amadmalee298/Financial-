import { describe, expect, it, vi } from "vitest";
import { fetchAllRows } from "./paginate";

/** A fake table of `n` rows (0..n-1) that answers inclusive range requests like PostgREST. */
function table(n: number, { failAt }: { failAt?: number } = {}) {
  const calls: [number, number][] = [];
  const page = vi.fn(async (from: number, to: number) => {
    calls.push([from, to]);
    if (failAt === from) return { data: null, count: null, error: new Error("boom") };
    const data = Array.from({ length: Math.max(0, Math.min(to, n - 1) - from + 1) }, (_, i) => from + i);
    return { data, count: n, error: null };
  });
  return { page, calls };
}

describe("fetchAllRows", () => {
  it("needs a single round trip (two parallel pages) for up to 2000 rows", async () => {
    for (const n of [0, 5, 1000, 1500, 1999]) {
      const { page, calls } = table(n);
      const rows = await fetchAllRows(page);
      expect(rows).toEqual(Array.from({ length: n }, (_, i) => i));
      expect(calls).toEqual([[0, 999], [1000, 1999]]);
    }
  });

  it("fetches the remaining pages together, in order, with nothing missing or repeated", async () => {
    for (const n of [2001, 3500, 7000]) {
      const { page, calls } = table(n);
      const rows = await fetchAllRows(page);
      expect(rows).toEqual(Array.from({ length: n }, (_, i) => i));
      expect(calls).toHaveLength(Math.ceil(n / 1000)); // one request per page, none repeated
    }
  });

  it("an exact multiple of the page size does not request an empty extra page", async () => {
    for (const [n, pages] of [[2000, 2], [3000, 3]] as const) {
      const { page, calls } = table(n);
      expect(await fetchAllRows(page)).toHaveLength(n);
      expect(calls).toHaveLength(pages);
    }
  });

  it("fails if any page fails", async () => {
    await expect(fetchAllRows(table(5000, { failAt: 1000 }).page)).rejects.toThrow();
    await expect(fetchAllRows(table(5000, { failAt: 3000 }).page)).rejects.toThrow();
  });
});
