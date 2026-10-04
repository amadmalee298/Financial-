import { describe, expect, it } from "vitest";
import { watchStatus } from "./watchlist";

describe("watchStatus", () => {
  it("is in the buy zone at or below the buy price", () => {
    const r = watchStatus("30", "32", "40");
    expect(r.status).toBe("buy_zone");
    expect(r.toBuyPct!.toString()).toBe("-0.0625");
    expect(r.upsidePct!.toFixed(4)).toBe("0.3333");
  });

  it("flags a reached target and plain watching", () => {
    expect(watchStatus("41", "32", "40").status).toBe("target_hit");
    expect(watchStatus("35", "32", "40").status).toBe("watching");
    expect(watchStatus("35", null, null)).toMatchObject({ status: "watching", toBuyPct: null, upsidePct: null });
  });

  it("handles a missing price", () => {
    expect(watchStatus(null, "32", "40").status).toBe("no_price");
  });
});
