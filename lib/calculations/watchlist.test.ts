import { describe, expect, it } from "vitest";
import { watchStatus } from "./watchlist";

describe("watchStatus", () => {
  it("is in the buy zone at or below the buy price", () => {
    const r = watchStatus("30", "32", "40");
    expect(r.status).toBe("buy_zone");
    expect(r.toBuyPct!.toFixed(4)).toBe("-0.0667");
    expect(r.upsidePct!.toFixed(4)).toBe("0.3333");
  });

  it("flags a reached target and plain watching", () => {
    expect(watchStatus("41", "32", "40").status).toBe("target_hit");
    expect(watchStatus("35", "32", "40").status).toBe("watching");
    expect(watchStatus("35", null, null)).toMatchObject({ status: "watching", toBuyPct: null, upsidePct: null });
  });

  it("measures the fall needed against today's price, so it never exceeds 100%", () => {
    // Price 99, buy at 30: must fall 69 baht = 69.7% of 99 (not 230% of 30).
    expect(watchStatus("99", "30", "120").toBuyPct!.toFixed(4)).toBe("0.6970");
    expect(watchStatus("35", "32", null).toBuyPct!.toFixed(4)).toBe("0.0857");
  });

  it("handles a missing price", () => {
    expect(watchStatus(null, "32", "40").status).toBe("no_price");
  });
});
