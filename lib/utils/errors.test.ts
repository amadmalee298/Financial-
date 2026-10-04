import { afterEach, describe, expect, it, vi } from "vitest";
import { loadError } from "./errors";

afterEach(() => vi.restoreAllMocks());

describe("loadError", () => {
  it("logs the real causes and returns a generic error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = loadError("โหลดไม่สำเร็จ", { code: "PGRST301", message: "JWT expired", hint: "refresh it" }, null, new TypeError("fetch failed"));

    expect(error.message).toBe("โหลดไม่สำเร็จ");
    const line = spy.mock.calls[0][0] as string;
    expect(line).toContain("[load-error] โหลดไม่สำเร็จ");
    expect(line).toContain("PGRST301 | JWT expired | refresh it");
    expect(line).toContain("TypeError: fetch failed");
  });

  it("includes the cause that Node hides behind 'fetch failed'", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const cause = Object.assign(new Error("Connect Timeout Error"), { name: "ConnectTimeoutError", code: "UND_ERR_CONNECT_TIMEOUT" });
    loadError("x", new TypeError("fetch failed", { cause }));
    const line = spy.mock.calls[0][0] as string;
    expect(line).toContain("TypeError: fetch failed");
    expect(line).toContain("ConnectTimeoutError: Connect Timeout Error [UND_ERR_CONNECT_TIMEOUT]");
  });

  it("still logs when no cause is given", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    loadError("x");
    expect(spy.mock.calls[0][0]).toContain("no detail");
  });
});
