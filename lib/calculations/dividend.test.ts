import { describe, expect, it } from "vitest";
import { dividendAmounts, sharesEligible } from "./dividend";
import { replayPosition } from "./profitLoss";

describe("dividendAmounts", () => {
  it("applies 10% withholding tax by default", () => {
    const r = dividendAmounts({ shares: "1500", dividendPerShare: "1.4" });
    expect([r.gross, r.withholdingTax, r.net].map(String)).toEqual(["2100", "210", "1890"]);
  });

  it("rounds to satang and accepts an explicit tax", () => {
    const r = dividendAmounts({ shares: "333", dividendPerShare: "0.33" }); // 109.89
    expect(r.withholdingTax.toString()).toBe("10.99");
    expect(r.net.toString()).toBe("98.9");
    expect(dividendAmounts({ shares: "100", dividendPerShare: "1", withholdingTax: "0" }).net.toString()).toBe("100");
  });
});

describe("sharesEligible", () => {
  const position = replayPosition([
    { id: "a", transaction_type: "BUY", trade_date: "2026-01-05", created_at: "1", quantity: "100", price: "1", total_amount: "100" },
    { id: "b", transaction_type: "BUY", trade_date: "2026-03-10", created_at: "2", quantity: "50", price: "1", total_amount: "50" },
    { id: "c", transaction_type: "SELL", trade_date: "2026-04-01", created_at: "3", quantity: "30", price: "1", total_amount: "30" },
  ]);

  it("counts only trades before the XD date", () => {
    expect(sharesEligible(position.entries, "2026-01-05").toString()).toBe("0");
    expect(sharesEligible(position.entries, "2026-03-10").toString()).toBe("100");
    expect(sharesEligible(position.entries, "2026-03-11").toString()).toBe("150");
    expect(sharesEligible(position.entries, "2026-05-01").toString()).toBe("120");
  });
});
