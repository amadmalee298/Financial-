import { afterEach, describe, expect, it, vi } from "vitest";
import { parseYahooChart, YahooProvider } from "./yahoo";
import { UnknownSymbolError } from "./provider";

// Shape of a Yahoo chart v8 response. 25200 s = UTC+7 (Bangkok).
// 1759201200 = 2025-09-30 03:00 UTC = 10:00 Bangkok.
const day = 86_400;
const chart = (timestamps: number[], close: (number | null)[]) => ({
  chart: {
    result: [{ meta: { gmtoffset: 25200 }, timestamp: timestamps, indicators: { quote: [{ close }] } }],
    error: null,
  },
});

describe("parseYahooChart", () => {
  it("returns exchange-local dates with 4-decimal closes, skipping null bars", () => {
    const t = 1759201200;
    const rows = parseYahooChart(chart([t, t + day, t + 2 * day], [34.25, null, 35.123456]));
    expect(rows).toEqual([
      { date: "2025-09-30", close: "34.2500" },
      { date: "2025-10-02", close: "35.1235" },
    ]);
  });

  it("puts a bar just after midnight UTC on the Bangkok day", () => {
    // 2025-10-01 20:00 UTC is already 2025-10-02 03:00 in Bangkok.
    const ts = Date.UTC(2025, 9, 1, 20) / 1000;
    expect(parseYahooChart(chart([ts], [10]))[0].date).toBe("2025-10-02");
  });

  it("keeps the last bar when a day appears twice", () => {
    const t = 1759201200;
    expect(parseYahooChart(chart([t, t + 600], [10, 11]))).toEqual([{ date: "2025-09-30", close: "11.0000" }]);
  });

  it("returns [] when there is no data and throws on errors", () => {
    expect(parseYahooChart({ chart: { result: [{ meta: {} }], error: null } })).toEqual([]);
    expect(() => parseYahooChart({ chart: { result: null, error: { code: "Not Found", description: "x" } } })).toThrow(
      UnknownSymbolError,
    );
    expect(() => parseYahooChart({ chart: { result: null, error: { code: "Too Many Requests" } } })).toThrow(/Too Many/);
  });
});

describe("YahooProvider", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("requests SYMBOL.BK with the period and parses the result", async () => {
    const fetchMock = vi.fn(async () => Response.json(chart([1759201200], [34.25])));
    vi.stubGlobal("fetch", fetchMock);

    const rows = await new YahooProvider("https://yahoo.test").fetchDailyCloses({
      symbol: "PTT",
      market: "SET",
      from: "2025-09-01",
    });

    expect(rows).toEqual([{ date: "2025-09-30", close: "34.2500" }]);
    const url = new URL((fetchMock.mock.calls[0] as unknown as [string])[0]);
    expect(url.origin + url.pathname).toBe("https://yahoo.test/v8/finance/chart/PTT.BK");
    expect(url.searchParams.get("period1")).toBe(String(Date.parse("2025-09-01T00:00:00Z") / 1000));
    expect(url.searchParams.get("interval")).toBe("1d");
  });

  it("encodes symbols with special characters", async () => {
    const fetchMock = vi.fn(async () => Response.json(chart([], [])));
    vi.stubGlobal("fetch", fetchMock);
    await new YahooProvider("https://yahoo.test").fetchDailyCloses({ symbol: "S&J", market: "SET", from: "2025-09-01" });
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toContain("/chart/S%26J.BK?");
  });

  it("maps a 404 body to UnknownSymbolError and other failures to errors", async () => {
    const notFound = { chart: { result: null, error: { code: "Not Found", description: "No data" } } };
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(notFound, { status: 404 })));
    const provider = new YahooProvider("https://yahoo.test");
    const request = { symbol: "NOPE", market: "SET", from: "2025-09-01" };
    await expect(provider.fetchDailyCloses(request)).rejects.toBeInstanceOf(UnknownSymbolError);

    vi.stubGlobal("fetch", vi.fn(async () => new Response("busy", { status: 503 })));
    await expect(provider.fetchDailyCloses(request)).rejects.toThrow("Yahoo HTTP 503");
  });

  it("only supports SET and mai", () => {
    const provider = new YahooProvider();
    expect([provider.supports("SET"), provider.supports("mai"), provider.supports("NASDAQ")]).toEqual([true, true, false]);
  });
});
