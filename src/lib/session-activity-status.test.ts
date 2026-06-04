import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSessionActivityStatus,
  resolveLastActivityAtMs,
} from "@/lib/session-activity-server";

describe("resolveLastActivityAtMs", () => {
  it("prefers cookie timestamp over db fallback", () => {
    expect(
      resolveLastActivityAtMs("1700000000000", new Date("2024-06-01T00:00:00Z")),
    ).toBe(1700000000000);
  });

  it("uses db fallback when cookie is missing", () => {
    const dbDate = new Date("2024-06-01T12:00:00.000Z");
    expect(resolveLastActivityAtMs(undefined, dbDate)).toBe(dbDate.getTime());
  });

  it("never invents a timestamp", () => {
    expect(resolveLastActivityAtMs(null, null)).toBeNull();
    expect(resolveLastActivityAtMs("", null)).toBeNull();
  });
});

describe("buildSessionActivityStatus", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("marks missing activity", () => {
    expect(buildSessionActivityStatus(null)).toEqual({ kind: "missing" });
  });

  it("marks expired sessions", () => {
    vi.stubEnv("NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_DEV_MINUTES", "");
    const now = 10_000_000_000;
    const last = now - 60 * 60 * 1000;
    expect(buildSessionActivityStatus(last, now)).toEqual({
      kind: "expired",
      lastActivityAtMs: last,
    });
  });

  it("returns active payload before timeout", () => {
    vi.stubEnv("NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_DEV_MINUTES", "");
    const now = 10_000_000_000;
    const last = now - 30 * 60 * 1000;
    const status = buildSessionActivityStatus(last, now);
    expect(status.kind).toBe("active");
    if (status.kind === "active") {
      expect(status.payload.msUntilExpiry).toBe(30 * 60 * 1000);
    }
  });
});
