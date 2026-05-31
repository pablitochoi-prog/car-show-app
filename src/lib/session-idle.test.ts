import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getIdleTimeoutMinutes,
  getIdleWarningMinutes,
  isIdleExpired,
  msUntilIdleExpiry,
  shouldShowIdleWarning,
} from "@/lib/session-idle";

describe("session-idle", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses 60 minute default timeout", () => {
    vi.stubEnv("NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_DEV_MINUTES", "");
    expect(getIdleTimeoutMinutes()).toBe(60);
    expect(getIdleWarningMinutes()).toBe(55);
  });

  it("supports dev override", () => {
    vi.stubEnv("NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_DEV_MINUTES", "2");
    expect(getIdleTimeoutMinutes()).toBe(2);
    expect(getIdleWarningMinutes()).toBe(1);
  });

  it("detects expiry at timeout boundary", () => {
    vi.stubEnv("NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_DEV_MINUTES", "");
    const now = 10_000_000_000;
    const last = now - 60 * 60 * 1000;
    expect(isIdleExpired(last, now)).toBe(true);
    expect(isIdleExpired(last + 1, now)).toBe(false);
  });

  it("shows warning between warning and timeout thresholds", () => {
    vi.stubEnv("NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_DEV_MINUTES", "");
    const now = 10_000_000_000;
    const at54 = now - 54 * 60 * 1000;
    const at55 = now - 55 * 60 * 1000;
    const at60 = now - 60 * 60 * 1000;

    expect(shouldShowIdleWarning(at54, now)).toBe(false);
    expect(shouldShowIdleWarning(at55, now)).toBe(true);
    expect(shouldShowIdleWarning(at60, now)).toBe(false);
  });

  it("computes remaining ms until expiry", () => {
    vi.stubEnv("NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_DEV_MINUTES", "");
    const now = 3_000_000;
    const last = now - 30 * 60 * 1000;
    expect(msUntilIdleExpiry(last, now)).toBe(30 * 60 * 1000);
  });
});
