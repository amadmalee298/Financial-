const PAGE_SIZE = 1000;

type Page<T> = { data: T[] | null; count: number | null; error: unknown };

/**
 * Read every row of a query. PostgREST caps each response at 1000 rows, so the
 * first two pages are requested together (enough for most portfolios, in a
 * single round trip); if more remain, the rest are fetched together too.
 * Rows come back in query order. `page(from, to)` is an inclusive row range
 * and its first result must report the total `count`.
 */
export async function fetchAllRows<T>(page: (from: number, to: number) => PromiseLike<Page<T>>) {
  const fail = () => new Error("โหลดข้อมูลราคาไม่สำเร็จ");

  const [a, b] = await Promise.all([page(0, PAGE_SIZE - 1), page(PAGE_SIZE, 2 * PAGE_SIZE - 1)]);
  if (a.error || !a.data || b.error || !b.data) throw fail();

  const rows = [...a.data, ...b.data];
  if (b.data.length < PAGE_SIZE) return rows;

  const total = a.count ?? rows.length;
  const starts: number[] = [];
  for (let from = 2 * PAGE_SIZE; from < total; from += PAGE_SIZE) starts.push(from);

  for (const result of await Promise.all(starts.map((from) => page(from, from + PAGE_SIZE - 1)))) {
    if (result.error || !result.data) throw fail();
    rows.push(...result.data);
  }
  return rows;
}
