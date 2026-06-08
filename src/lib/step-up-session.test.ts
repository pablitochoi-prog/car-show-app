import { describe, expect, it } from "vitest";
import { isStepUpValidForSession } from "@/lib/step-up-session";
import { STEP_UP_FRESHNESS_MS } from "@/lib/step-up-config";
import type { StepUpCookiePayload } from "@/lib/step-up-crypto";

function payload(
  overrides: Partial<StepUpCookiePayload> = {},
): StepUpCookiePayload {
  return {
    userId: "user-A",
    sessionId: "sess-A",
    purpose: "ORGANIZER_STEP_UP",
    verifiedAt: Date.now(),
    ...overrides,
  };
}

describe("isStepUpValidForSession", () => {
  it("accepts a fresh cookie for the same user and session", () => {
    expect(isStepUpValidForSession(payload(), "user-A", "sess-A")).toBe(true);
  });

  it("rejects a cookie minted in session A when presented in session B", () => {
    expect(
      isStepUpValidForSession(payload({ sessionId: "sess-A" }), "user-A", "sess-B"),
    ).toBe(false);
  });

  it("rejects a cookie that belongs to a different user", () => {
    expect(isStepUpValidForSession(payload(), "user-B", "sess-A")).toBe(false);
  });

  it("rejects a cookie past the verifiedAt freshness window", () => {
    const stale = payload({ verifiedAt: Date.now() - STEP_UP_FRESHNESS_MS - 1_000 });
    expect(isStepUpValidForSession(stale, "user-A", "sess-A")).toBe(false);
  });

  it("rejects a cookie with a missing/invalid verifiedAt", () => {
    expect(
      isStepUpValidForSession(payload({ verifiedAt: 0 }), "user-A", "sess-A"),
    ).toBe(false);
  });

  it("still enforces user + freshness when no sessionId is supplied", () => {
    expect(isStepUpValidForSession(payload(), "user-A", null)).toBe(true);
    expect(
      isStepUpValidForSession(payload({ verifiedAt: 1 }), "user-A", null),
    ).toBe(false);
  });

  it("rejects a null payload", () => {
    expect(isStepUpValidForSession(null, "user-A", "sess-A")).toBe(false);
  });
});
