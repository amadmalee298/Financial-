import { describe, expect, it } from "vitest";
import { buildHoldings, summarize, type PortfolioTransaction } from "./portfolio";
import { replayPosition } from "./profitLoss";
import { dividendsByStock } from "./dividend";
import { transactionTotal } from "./transaction";

let seq = 0;
function tx(
  type: "BUY" | "SELL",
  date: string,
  quantity: string,
  price: string,
  costs = "0",
  stock = "PTT",
): PortfolioTransaction {
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
  };
}

describe("replayPosition (average cost)", () => {
  it("averages cost across buys, including costs", () => {
    const p = replayPosition([
      tx("BUY", "2026-01-05", "100", "10", "5"), // 1005
      tx("BUY", "2026-01-10", "100", "12", "5"), // 1205
    ]);
    expect(p.shares.toString()).toBe("200");
    expect(p.costBasis.toString()).toBe("2210");
    expect(p.avgCost.toString()).toBe("11.05");
    expect(p.realizedPL.toString()).toBe("0");
  });

  it("realizes P/L on sells at average cost and keeps the average", () => {
    const p = replayPosition([
      tx("BUY", "2026-01-05", "100", "10", "5"),
      tx("BUY", "2026-01-10", "100", "12", "5"),
      tx("SELL", "2026-02-01", "50", "15", "4"), // proceeds 746, cost 552.5
    ]);
    expect(p.shares.toString()).toBe("150");
    expect(p.costBasis.toString()).toBe("1657.5");
    expect(p.avgCost.toString()).toBe("11.05");
    expect(p.realizedPL.toString()).toBe("193.5");
    expect(p.entries.at(-1)!.realizedPL.toString()).toBe("193.5");
  });

  it("resets cost to zero after selling everything", () => {
    const p = replayPosition([
      tx("BUY", "2026-01-05", "3", "33.33"), // 99.99
      tx("SELL", "2026-02-01", "1", "40"),
      tx("SELL", "2026-02-02", "2", "40"),
    ]);
    expect(p.shares.isZero()).toBe(true);
    expect(p.costBasis.isZero()).toBe(true);
    // 120 − 99.99, with no rounding drift from the 1/3 splits
    expect(p.realizedPL.toString()).toBe("20.01");
  });

  it("orders by trade date, not entry order, and BUY before SELL on the same day", () => {
    const sell = tx("SELL", "2026-01-05", "100", "11");
    const buy = tx("BUY", "2026-01-05", "100", "10");
    const p = replayPosition([sell, buy]);
    expect(p.oversold).toBeNull();
    expect(p.realizedPL.toString()).toBe("100");
  });

  it("flags a sell that exceeds the shares held at that date", () => {
    const sell = tx("SELL", "2026-01-01", "10", "11");
    const p = replayPosition([tx("BUY", "2026-01-05", "100", "10"), sell]);
    expect(p.oversold).toBe(sell);
    expect(p.shares.toString()).toBe("100");
  });

  it("avoids floating point errors", () => {
    const p = replayPosition([
      tx("BUY", "2026-01-05", "1", "0.1"),
      tx("BUY", "2026-01-06", "1", "0.2"),
    ]);
    expect(p.costBasis.toString()).toBe("0.3");
  });
});

describe("buildHoldings / summarize", () => {
  const transactions = [
    tx("BUY", "2026-01-05", "100", "34.25", "5.87", "PTT"), // 3430.87
    tx("SELL", "2026-02-05", "40", "36.5", "2.45", "PTT"), // 1457.55
    tx("BUY", "2026-01-10", "200", "60", "0", "AOT"), // 12000
    tx("BUY", "2026-01-10", "10", "100", "0", "KBANK"),
    tx("SELL", "2026-03-01", "10", "120", "0", "KBANK"),
  ];

  it("uses a newer manual price over the last trade price", () => {
    const holdings = buildHoldings(transactions, [
      { stock_id: "PTT", price: "35", price_date: "2026-03-01" },
      { stock_id: "AOT", price: "55", price_date: "2025-12-31" }, // older than last trade
    ]);
    const ptt = holdings.find((h) => h.symbol === "PTT")!;
    const aot = holdings.find((h) => h.symbol === "AOT")!;
    expect(ptt.priceSource).toBe("manual");
    expect(ptt.marketValue.toString()).toBe("2100");
    expect(aot.priceSource).toBe("last_trade");
    expect(aot.price.toString()).toBe("60");
  });

  it("computes P/L per holding and in total", () => {
    const holdings = buildHoldings(
      transactions,
      [{ stock_id: "PTT", price: "35", price_date: "2026-03-01" }],
      dividendsByStock([{ stock_id: "PTT", net_amount: "90", gross_amount: null, withholding_tax: null }]),
    );
    const ptt = holdings.find((h) => h.symbol === "PTT")!;
    // cost 3430.87 × 60/100 = 2058.522
    expect(ptt.costBasis.toString()).toBe("2058.522");
    expect(ptt.realizedPL.toString()).toBe("85.202"); // 1457.55 − 1372.348
    expect(ptt.unrealizedPL.toString()).toBe("41.478"); // 2100 − 2058.522
    expect(ptt.totalReturn.toString()).toBe("216.68");

    const s = summarize(holdings);
    expect(s.holdingsCount).toBe(2); // KBANK is closed
    expect(s.marketValue.toString()).toBe("14100");
    expect(s.realizedPL.toString()).toBe("285.202"); // + 200 from KBANK
    expect(s.dividends.toString()).toBe("90");
    expect(holdings.map((h) => h.symbol)).toEqual(["AOT", "PTT", "KBANK"]);
    expect(holdings[0].weight.toFixed(4)).toBe("0.8511");
  });

  it("derives net dividends from gross minus tax", () => {
    const totals = dividendsByStock([
      { stock_id: "A", net_amount: null, gross_amount: "100", withholding_tax: "10" },
      { stock_id: "A", net_amount: "45", gross_amount: "50", withholding_tax: "5" },
    ]);
    expect(totals.get("A")!.toString()).toBe("135");
  });
});

describe("allocation", () => {
  it("groups by key and folds the tail into อื่นๆ", async () => {
    const { allocation } = await import("./allocation");
    const holdings = buildHoldings([
      tx("BUY", "2026-01-01", "10", "50", "0", "A"),
      tx("BUY", "2026-01-01", "10", "30", "0", "B"),
      tx("BUY", "2026-01-01", "10", "15", "0", "C"),
      tx("BUY", "2026-01-01", "10", "5", "0", "D"),
    ]);
    const slices = allocation(holdings, (h) => h.symbol, 3);
    expect(slices.map((s) => [s.label, s.weight.toString()])).toEqual([
      ["A", "0.5"],
      ["B", "0.3"],
      ["อื่นๆ", "0.2"],
    ]);
  });
});

describe("price selection with market data", () => {
  const txs = [tx("BUY", "2026-01-05", "100", "10", "0", "PTT")];

  it("uses a newer market close over the last trade", () => {
    const [h] = buildHoldings(txs, [], new Map(), [{ stock_id: "PTT", close: "12.5", price_date: "2026-02-01" }]);
    expect(h.priceSource).toBe("market");
    expect(h.price.toString()).toBe("12.5");
    expect(h.marketValue.toString()).toBe("1250");
  });

  it("lets a manual price win only until the market has a newer close", () => {
    const manual = [{ stock_id: "PTT", price: "15", price_date: "2026-02-01" }];
    const sameDay = buildHoldings(txs, manual, new Map(), [{ stock_id: "PTT", close: "12.5", price_date: "2026-02-01" }]);
    expect(sameDay[0].priceSource).toBe("manual");
    const newer = buildHoldings(txs, manual, new Map(), [{ stock_id: "PTT", close: "12.5", price_date: "2026-02-02" }]);
    expect(newer[0].priceSource).toBe("market");
  });

  it("ignores a market close older than the last trade", () => {
    const [h] = buildHoldings(txs, [], new Map(), [{ stock_id: "PTT", close: "9", price_date: "2026-01-01" }]);
    expect(h.priceSource).toBe("last_trade");
  });
});
