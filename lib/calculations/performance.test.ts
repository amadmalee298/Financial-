import { describe, expect, it } from "vitest";
import { buildPerformance } from "./performance";
import { totalsByPeriod } from "./reports";
import type { PortfolioTransaction } from "./portfolio";
import { transactionTotal } from "./transaction";

let seq = 0;
function tx(type: "BUY" | "SELL", date: string, quantity: string, price: string, stock = "PTT", costs = "0") {
  seq += 1;
  return {
    id: `t${seq}`,
    stock_id: stock,
    stock: { symbol: stock, name: null, sector: null },
    transaction_type: type,
    trade_date: date,
    created_at: `2026-01-01T00:00:${String(seq).padStart(2, "0")}Z`,
    quantity,
    price,
    total_amount: transactionTotal({ type, quantity, price, commission: costs }).toString(),
    commission: costs,
    fees: "0",
    vat: "0",
  } satisfies PortfolioTransaction & Record<string, unknown>;
}

describe("buildPerformance", () => {
  const txs = [
    tx("BUY", "2026-01-05", "100", "10"),
    tx("BUY", "2026-02-01", "10", "50", "AOT"),
    tx("SELL", "2026-03-01", "50", "14"),
  ];

  it("returns one point per trade date plus today, valued at last known prices", () => {
    const points = buildPerformance(txs, [], [], "2026-04-01");
    expect(points.map((p) => p.date)).toEqual(["2026-01-05", "2026-02-01", "2026-03-01", "2026-04-01"]);
    expect(points.map((p) => p.costBasis.toString())).toEqual(["1000", "1500", "1000", "1000"]);
    // 2026-03-01: 50 PTT × 14 + 10 AOT × 50
    expect(points[2].marketValue.toString()).toBe("1200");
    expect(points[2].realizedPL.toString()).toBe("200");
    expect(points[2].estimated).toBe(true);
    expect(points[3].estimated).toBe(false);
  });

  it("uses recorded snapshots and manual prices", () => {
    const points = buildPerformance(
      txs,
      [{ stock_id: "AOT", price: "60", price_date: "2026-03-15" }],
      [
        { snapshot_date: "2026-03-10", market_value: "1234.5", cost_basis: "1000" },
        // stale: recorded before a back-dated entry changed the cost basis
        { snapshot_date: "2026-03-20", market_value: "999", cost_basis: "800" },
      ],
      "2026-04-01",
    );
    const snap = points.find((p) => p.date === "2026-03-10")!;
    expect(snap.marketValue.toString()).toBe("1234.5");
    expect(snap.estimated).toBe(false);
    const stale = points.find((p) => p.date === "2026-03-20")!;
    expect(stale.marketValue.toString()).toBe("1300"); // 50 × 14 + 10 × 60 (manual)
    expect(stale.estimated).toBe(true);
    expect(points.at(-1)!.marketValue.toString()).toBe("1300"); // 700 + 600
  });

  it("returns nothing without transactions", () => {
    expect(buildPerformance([], [], [], "2026-04-01")).toEqual([]);
  });
});

describe("totalsByPeriod", () => {
  const txs = [
    tx("BUY", "2025-12-05", "100", "10", "PTT", "10"),
    tx("SELL", "2026-01-10", "50", "12", "PTT", "5"),
    tx("SELL", "2026-03-10", "50", "9", "PTT"),
  ];
  const dividends = [
    { payment_date: "2026-03-20", xd_date: null, net_amount: "45", gross_amount: null, withholding_tax: null },
  ];

  it("groups by year", () => {
    const years = totalsByPeriod(txs, dividends, 4);
    expect(years.map((y) => y.period)).toEqual(["2026", "2025"]);
    // cost 1010; sold 50 for 595 (cost 505) and 50 for 450 (cost 505)
    expect(years[0].realizedPL.toString()).toBe("35");
    expect(years[0].dividends.toString()).toBe("45");
    expect(years[1].bought.toString()).toBe("1010");
    expect(years[1].costs.toString()).toBe("10");
  });

  it("groups by month", () => {
    const months = totalsByPeriod(txs, dividends, 7);
    expect(months.map((m) => [m.period, m.realizedPL.toString()])).toEqual([
      ["2026-03", "-55"],
      ["2026-01", "90"],
      ["2025-12", "0"],
    ]);
  });
});

describe("buildPerformance with market closes", () => {
  const txs = [tx("BUY", "2026-01-05", "100", "10"), tx("SELL", "2026-03-01", "100", "14")];
  const closes = [
    { stock_id: "PTT", price_date: "2026-01-05", close: "10" },
    { stock_id: "PTT", price_date: "2026-01-06", close: "11" },
    { stock_id: "PTT", price_date: "2026-01-07", close: "12" },
    { stock_id: "PTT", price_date: "2026-02-27", close: "13" },
  ];

  it("values past dates at the market close and marks them as real", () => {
    const points = buildPerformance(txs, [], [], "2026-04-01", closes);
    const first = points.find((p) => p.date === "2026-01-05")!;
    expect(first.marketValue.toString()).toBe("1000");
    expect(first.estimated).toBe(false);
  });

  it("includes days with a close even when nothing was traded", () => {
    const points = buildPerformance(txs, [], [], "2026-04-01", closes);
    expect(points.map((p) => p.date)).toContain("2026-01-06");
    expect(points.find((p) => p.date === "2026-01-06")!.marketValue.toString()).toBe("1100");
  });

  it("falls back to an estimate when the newest close is too old", () => {
    const sparse = [{ stock_id: "PTT", price_date: "2026-01-05", close: "10" }];
    const points = buildPerformance([tx("BUY", "2026-01-05", "100", "10"), tx("BUY", "2026-02-20", "10", "12", "AOT")], [], [], "2026-04-01", sparse);
    const feb = points.find((p) => p.date === "2026-02-20")!;
    expect(feb.estimated).toBe(true);
  });

  it("is exact once everything is sold", () => {
    const points = buildPerformance(txs, [], [], "2026-04-01", closes);
    const after = points.find((p) => p.date === "2026-03-01")!;
    expect(after.marketValue.toString()).toBe("0");
    expect(after.estimated).toBe(false);
  });
});
