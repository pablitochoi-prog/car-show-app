import { afterEach, describe, expect, it, vi } from "vitest";
import { isRequestTimingEnabled, timeAsync } from "@/lib/request-timing";

describe("request-timing", () => {
  afterEach(() => {
    delete process.env.REQUEST_TIMING;
    vi.restoreAllMocks();
  });

  it("is disabled unless REQUEST_TIMING=1", () => {
    expect(isRequestTimingEnabled()).toBe(false);
    process.env.REQUEST_TIMING = "1";
    expect(isRequestTimingEnabled()).toBe(true);
  });

  it("runs fn without logging when disabled", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const result = await timeAsync("test", async () => 42);
    expect(result).toBe(42);
    expect(spy).not.toHaveBeenCalled();
  });

  it("logs elapsed ms when enabled", async () => {
    process.env.REQUEST_TIMING = "1";
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    await timeAsync("test.label", async () => {});
    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(/^\[request-timing\] test\.label \d+ms$/),
    );
  });
});
