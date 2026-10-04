import { loadError } from "./errors";

const PAGE_SIZE = 1000;

type Page<T> = { data: T[] | null; count: number | null; error: unknown };

/** PostgREST's error for a range that starts past the last row (HTTP 416). */
const RANGE_NOT_SATISFIABLE = "PGRST103";

const isPastTheEnd = (error: unknown) =>
  typeof error === "object" && error !== null && (error as { code?: unknown }).code === RANGE_NOT_SATISFIABLE;

/**
 * Read every row of a query. PostgREST caps each response at 1000 rows, so a
 * long result needs several requests. `page(from, to)` is an inclusive row range
 * and should ask for the exact `count`.
 *
 * - A first page with fewer than 1000 rows is the whole result: one request.
 *   Never ask for a page that starts past the end: PostgREST answers 416
 *   (PGRST103) instead of an empty list, which would fail the whole load.
 * - When the first page is full, the rest are fetched together, in order.
 * - Without a total, pages are read one after another until a short one.
 */
export async function fetchAllRows<T>(page: (from: number, to: number) => PromiseLike<Page<T>>) {
  const first = await page(0, PAGE_SIZE - 1);
  if (first.error || !first.data) throw loadError("history", "โหลดข้อมูลราคาไม่สำเร็จ", first.error);
  if (first.data.length < PAGE_SIZE) return first.data;

  const rows = [...first.data];

  if (first.count === null) {
    for (let from = PAGE_SIZE; ; from += PAGE_SIZE) {
      const next = await page(from, from + PAGE_SIZE - 1);
      if (isPastTheEnd(next.error)) return rows;
      if (next.error || !next.data) throw loadError("history", "โหลดข้อมูลราคาไม่สำเร็จ", next.error);
      rows.push(...next.data);
      if (next.data.length < PAGE_SIZE) return rows;
    }
  }

  const starts: number[] = [];
  for (let from = PAGE_SIZE; from < first.count; from += PAGE_SIZE) starts.push(from);

  for (const result of await Promise.all(starts.map((from) => page(from, from + PAGE_SIZE - 1)))) {
    // Rows removed since the first request can leave a page past the end: nothing to add.
    if (isPastTheEnd(result.error)) continue;
    if (result.error || !result.data) throw loadError("history", "โหลดข้อมูลราคาไม่สำเร็จ", result.error);
    rows.push(...result.data);
  }
  return rows;
}
