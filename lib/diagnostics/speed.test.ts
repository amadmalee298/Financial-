import { describe, expect, it } from "vitest";
import { median, speedFindings, type SpeedMeasurements } from "./speed";

const base: SpeedMeasurements = {
  staticMs: [90, 100, 110],
  functionMs: [220, 200, 210, 205],
  dbMs: [30, 25, 28, 26],
  pageMs: [900, 450, 430],
  region: "sin1",
};
const levels = (m: SpeedMeasurements) => speedFindings(m).map((f) => f.level);

describe("median", () => {
  it("handles odd, even and empty lists", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe("speedFindings", () => {
  it("reports no problem when everything is close and quick", () => {
    expect(speedFindings(base).map((f) => f.text).join(" ")).toContain("ไม่พบจุดคอขวด");
    expect(levels(base)).toEqual(["ok", "ok", "ok"]);
  });

  it("names a far database as the main cause when pages really are over 3 s", () => {
    const far = { ...base, region: "iad1", dbMs: [900, 240, 235, 250], pageMs: [6500, 3800, 3600] };
    const [first] = speedFindings(far);
    expect(first.level).toBe("bad");
    expect(first.text).toContain("iad1");
    expect(first.text).toContain("สาเหตุหลัก");
    expect(first.text).toContain("Function Region");
  });

  it("only warns about a far database while pages are still fast", () => {
    const far = { ...base, region: "iad1", dbMs: [900, 240, 235, 250], pageMs: [900, 700, 650] };
    const [first] = speedFindings(far);
    expect(first.level).toBe("warn");
    expect(first.text).not.toContain("สาเหตุหลัก");
  });

  it("still calls it the main cause when the page was not measured", () => {
    expect(speedFindings({ ...base, dbMs: [900, 240, 235, 250], pageMs: [] })[0].level).toBe("bad");
  });

  it("calls 40–120 ms a warning, not a failure", () => {
    expect(levels({ ...base, dbMs: [80, 70, 75, 72] })[0]).toBe("warn");
  });

  it("separates one-off costs from steady state", () => {
    const cold = { ...base, functionMs: [2100, 200, 210, 205], dbMs: [800, 25, 28, 26] };
    const text = speedFindings(cold).map((f) => f.text).join("\n");
    expect(text).toContain("cold start");
    expect(text).toContain("คำขอแรกไปฐานข้อมูลช้ากว่าปกติ");
    expect(levels(cold)[0]).toBe("ok"); // steady state is still fine
  });

  it("flags a slow phone-to-Vercel network", () => {
    expect(speedFindings({ ...base, staticMs: [600, 650, 700] }).some((f) => f.text.includes("เครือข่ายจากมือถือ"))).toBe(true);
  });
});

describe("real page timing against the 3 second target", () => {
  const page = (pageMs: number[]) => speedFindings({ ...base, pageMs }).find((f) => f.text.includes("หน้าภาพรวม"))!;

  it("passes when the page is under 3 s", () => {
    expect(page([900, 450, 430]).level).toBe("ok");
  });

  it("fails when the steady state is over 3 s, even if the first load was the slow one", () => {
    const slow = page([6500, 3800, 3600]);
    expect(slow.level).toBe("bad");
    expect(slow.text).toContain("3.7");
  });

  it("only warns when just the first load is over 3 s (cold start)", () => {
    expect(page([4200, 800, 750]).level).toBe("warn");
  });

  it("says nothing about the page when it was not measured", () => {
    expect(speedFindings({ ...base, pageMs: [] }).some((f) => f.text.includes("หน้าภาพรวม"))).toBe(false);
  });
});
