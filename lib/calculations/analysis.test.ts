import { describe, expect, it } from "vitest";
import { valuation } from "./analysis";

describe("valuation", () => {
  it("computes P/E, margin of safety and upside at the current price", () => {
    const v = valuation({ price: "30", eps: "2.5", fairValue: "40", targetPrice: "36" });
    expect(v.peAtPrice!.toString()).toBe("12");
    expect(v.marginOfSafety!.toString()).toBe("0.25");
    expect(v.upside!.toString()).toBe("0.2");
  });

  it("returns null where an input is missing or EPS is not positive", () => {
    expect(valuation({ price: null, eps: "1", fairValue: "1", targetPrice: "1" })).toEqual({
      peAtPrice: null,
      marginOfSafety: null,
      upside: null,
    });
    const v = valuation({ price: "30", eps: "-1", fairValue: "20", targetPrice: null });
    expect(v.peAtPrice).toBeNull();
    expect(v.marginOfSafety!.toString()).toBe("-0.5");
    expect(v.upside).toBeNull();
  });
});
