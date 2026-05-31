import { describe, expect, it, vi } from "vitest";
import {
  logPerfTiming,
  perfTimingElapsed,
  perfTimingStart,
  vehicleEntryCodePrefix,
  withPerfTiming,
} from "./perf-timing";

describe("perf-timing", () => {
  it("logs compact JSON with perf flag", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    logPerfTiming({
      name: "test.op",
      durationMs: 12,
      success: true,
      eventId: "evt-1",
      unused: undefined,
    });
    expect(info).toHaveBeenCalledOnce();
    const line = info.mock.calls[0]![0] as string;
    const parsed = JSON.parse(line) as Record<string, unknown>;
    expect(parsed.perf).toBe(true);
    expect(parsed.name).toBe("test.op");
    expect(parsed.durationMs).toBe(12);
    expect(parsed.success).toBe(true);
    expect(parsed.eventId).toBe("evt-1");
    expect(parsed.unused).toBeUndefined();
    info.mockRestore();
  });

  it("vehicleEntryCodePrefix returns prefix only", () => {
    expect(vehicleEntryCodePrefix("axy-004")).toBe("axy");
    expect(vehicleEntryCodePrefix("")).toBeUndefined();
  });

  it("withPerfTiming records success from outcome", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const result = await withPerfTiming(
      "test.fn",
      { eventId: "e1" },
      async () => 42,
      (value) => ({ success: value === 42, count: value }),
    );
    expect(result).toBe(42);
    const parsed = JSON.parse(info.mock.calls[0]![0] as string) as {
      success: boolean;
      count: number;
    };
    expect(parsed.success).toBe(true);
    expect(parsed.count).toBe(42);
    info.mockRestore();
  });

  it("perfTimingElapsed returns non-negative ms", () => {
    const start = perfTimingStart();
    expect(perfTimingElapsed(start)).toBeGreaterThanOrEqual(0);
  });
});
