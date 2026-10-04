import { describe, expect, it } from "vitest";
import { fetchFrom } from "./range";

describe("fetchFrom", () => {
  it("starts at the first needed day when nothing is stored", () => {
    expect(fetchFrom("2025-06-10", null)).toBe("2025-06-10");
  });

  it("re-fetches a week of overlap before the newest stored price", () => {
    expect(fetchFrom("2025-06-10", "2026-10-01")).toBe("2026-09-24");
  });

  it("never starts before the first needed day", () => {
    expect(fetchFrom("2026-09-30", "2026-10-01")).toBe("2026-09-30");
  });
});
