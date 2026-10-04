/** Days of history re-fetched for stocks that already have prices. */
const OVERLAP_DAYS = 7;

const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/**
 * Where to start fetching for a stock: its first needed day when it has no
 * stored prices, otherwise a short overlap before the newest stored price
 * (so a corrected or late bar is picked up).
 */
export function fetchFrom(needFrom: string, latestStored: string | null) {
  if (!latestStored) return needFrom;
  const from = addDays(latestStored, -OVERLAP_DAYS);
  return from > needFrom ? from : needFrom;
}
