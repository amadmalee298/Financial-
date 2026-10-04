import { type DailyClose, type PriceProvider, type PriceRequest, UnknownSymbolError } from "./provider";

const DEFAULT_BASE_URL = "https://query1.finance.yahoo.com";
const TIMEOUT_MS = 8_000;

/** SET and mai symbols are quoted on Yahoo with a ".BK" suffix. */
const SUFFIX: Record<string, string> = { SET: ".BK", MAI: ".BK" };

type ChartResponse = {
  chart?: {
    result?:
      | {
          meta?: { gmtoffset?: number };
          timestamp?: number[];
          indicators?: { quote?: { close?: (number | null)[] }[] };
        }[]
      | null;
    error?: { code?: string; description?: string } | null;
  };
};

/**
 * Parse a Yahoo chart v8 response into daily closes. Dates are taken in the
 * exchange's own time zone (gmtoffset), so Bangkok bars land on Bangkok days.
 * Bars with a null close (halted / no trade) are skipped.
 */
export function parseYahooChart(json: ChartResponse): DailyClose[] {
  const error = json.chart?.error;
  if (error) {
    if (error.code === "Not Found") throw new UnknownSymbolError(error.description ?? "Not Found");
    throw new Error(`Yahoo error: ${error.code ?? "unknown"}`);
  }

  const result = json.chart?.result?.[0];
  const timestamps = result?.timestamp;
  const closes = result?.indicators?.quote?.[0]?.close;
  if (!result || !timestamps || !closes) return [];

  const offset = result.meta?.gmtoffset ?? 0;
  const byDate = new Map<string, string>();
  timestamps.forEach((ts, i) => {
    const close = closes[i];
    if (close === null || close === undefined || !Number.isFinite(close) || close < 0) return;
    const date = new Date((ts + offset) * 1000).toISOString().slice(0, 10);
    // Round to the table's 4 decimals; later bars of the same day win.
    byDate.set(date, close.toFixed(4));
  });

  return [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, close]) => ({ date, close }));
}

export class YahooProvider implements PriceProvider {
  readonly name = "yahoo";

  constructor(private readonly baseUrl: string = DEFAULT_BASE_URL) {}

  supports(market: string) {
    return market.toUpperCase() in SUFFIX;
  }

  async fetchDailyCloses({ symbol, market, from }: PriceRequest): Promise<DailyClose[]> {
    const suffix = SUFFIX[market.toUpperCase()];
    if (suffix === undefined) throw new Error(`Yahoo: unsupported market ${market}`);

    const period1 = Math.floor(Date.parse(`${from}T00:00:00Z`) / 1000);
    const period2 = Math.floor(Date.now() / 1000) + 86_400;
    const url =
      `${this.baseUrl}/v8/finance/chart/${encodeURIComponent(symbol + suffix)}` +
      `?period1=${period1}&period2=${period2}&interval=1d&events=history`;

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; investment-tracker)", Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    // Yahoo reports unknown symbols as 404 with a JSON error body.
    const body = (await response.json().catch(() => null)) as ChartResponse | null;
    if (!response.ok && !body?.chart?.error) throw new Error(`Yahoo HTTP ${response.status}`);
    if (!body) throw new Error("Yahoo returned invalid JSON");
    return parseYahooChart(body);
  }
}
