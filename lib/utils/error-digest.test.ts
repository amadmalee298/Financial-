import { describe, expect, it } from "vitest";
import { buildDigest, explainDigest } from "./error-digest";

describe("buildDigest", () => {
  it("uses the database error code", () => {
    expect(buildDigest("portfolio", [{ code: "PGRST205", message: "Could not find the table 'public.x'", details: "secret" }])).toBe(
      "E-portfolio-PGRST205",
    );
  });

  it("names the kind of network failure when there is no code", () => {
    expect(buildDigest("market", [{ code: "", message: "TypeError: fetch failed" }])).toBe("E-market-FETCH_FAILED");
    expect(buildDigest("market", [{ message: "The operation was aborted due to timeout" }])).toBe("E-market-TIMEOUT");
  });

  it("uses an Error's class and the code of its cause", () => {
    const cause = Object.assign(new Error("x"), { code: "UND_ERR_CONNECT_TIMEOUT" });
    const error = Object.assign(new Error("keys"), { name: "AuthRetryableFetchError", cause });
    expect(buildDigest("auth", [error])).toBe("E-auth-AuthRetryableFetchError_UND_ERR_CONNECT_TIMEOUT");
  });

  it("de-duplicates, skips empty causes and falls back safely", () => {
    expect(buildDigest("portfolio", [null, { code: "42P01" }, { code: "42P01" }, { code: "42501" }])).toBe("E-portfolio-42P01+42501");
    expect(buildDigest("x", [])).toBe("E-x-ERR");
    expect(buildDigest("", ["just a string"])).toBe("E-load-ERR");
  });

  it("never lets messages, URLs or other text through", () => {
    const digest = buildDigest("portfolio", [{ code: "PGRST1;<script>alert(1)</script>", message: "https://x.supabase.co key=abc" }]);
    expect(digest).toMatch(/^E-[A-Za-z0-9_]+-[A-Za-z0-9_+]+$/);
    expect(digest).not.toContain("supabase.co");
    expect(digest.length).toBeLessThan(120);
  });
});

describe("explainDigest", () => {
  it("explains a missing table as an unfinished database setup", () => {
    expect(explainDigest("E-portfolio-PGRST205")).toContain("setup_all.sql");
    expect(explainDigest("E-transactions-42P01")).toContain("setup_all.sql");
  });

  it("explains permission and session problems", () => {
    expect(explainDigest("E-portfolio-PGRST301")).toContain("ออกจากระบบ");
    expect(explainDigest("E-portfolio-42501")).toContain("ออกจากระบบ");
  });

  it("explains network failures, including the Vercel region hint", () => {
    expect(explainDigest("E-portfolio-FETCH_FAILED")).toContain("Function Region");
    expect(explainDigest("E-history-TIMEOUT")).toContain("Paused");
    expect(explainDigest("E-auth-AuthRetryableFetchError_UND_ERR_SOCKET")).toContain("Supabase");
  });

  it("says nothing for numeric Next digests or unknown codes", () => {
    expect(explainDigest("2454444832")).toBeNull();
    expect(explainDigest(undefined)).toBeNull();
    expect(explainDigest("E-portfolio-SOMETHING_NEW")).toBeNull();
  });
});
