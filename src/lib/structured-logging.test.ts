import { describe, expect, it, vi } from "vitest";
import {
  logBackgroundTask,
  logDashCardQrFailure,
  logRateLimitEvent,
  sanitizeErrorForLog,
  sanitizeErrorMessage,
} from "./structured-logging";

describe("sanitizeErrorMessage", () => {
  it("redacts emails and phone numbers", () => {
    const msg = sanitizeErrorMessage(
      "Failed for user@example.com at 555-123-4567",
    );
    expect(msg).not.toContain("user@example.com");
    expect(msg).not.toContain("555-123-4567");
    expect(msg).toContain("[email]");
    expect(msg).toContain("[phone]");
  });

  it("redacts stripe identifiers", () => {
    const msg = sanitizeErrorMessage("Charge pi_abc123 failed for cs_test_xyz");
    expect(msg).toContain("[payment_intent]");
    expect(msg).toContain("[checkout_session]");
    expect(msg).not.toContain("pi_abc123");
  });
});

describe("sanitizeErrorForLog", () => {
  it("returns safe error type and message", () => {
    const out = sanitizeErrorForLog(new Error("boom"));
    expect(out.errorType).toBe("Error");
    expect(out.errorMessage).toBe("boom");
  });
});

describe("logBackgroundTask", () => {
  it("emits JSON with backgroundTask flag and no raw error object", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    logBackgroundTask({
      name: "staff_photo_sync",
      route: "api.events.register",
      eventId: "evt-1",
      registrationId: "reg-1",
      durationMs: 42,
      success: true,
    });
    const parsed = JSON.parse(info.mock.calls[0]![0] as string) as Record<
      string,
      unknown
    >;
    expect(parsed.backgroundTask).toBe(true);
    expect(parsed.name).toBe("staff_photo_sync");
    expect(parsed.success).toBe(true);
    info.mockRestore();
  });

  it("includes sanitized error fields on failure", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logBackgroundTask({
      name: "confirmation_email",
      route: "api.events.register-guest",
      eventId: "evt-1",
      registrationId: "reg-2",
      durationMs: 10,
      success: false,
      error: new Error("SendGrid timeout for secret@example.com"),
    });
    const parsed = JSON.parse(errorSpy.mock.calls[0]![0] as string) as Record<
      string,
      unknown
    >;
    expect(parsed.backgroundTask).toBe(true);
    expect(parsed.success).toBe(false);
    expect(String(parsed.errorMessage)).toContain("[email]");
    expect(parsed.error).toBeUndefined();
    errorSpy.mockRestore();
  });
});

describe("logRateLimitEvent", () => {
  it("includes limited flag and retryAfterSeconds", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    logRateLimitEvent({
      route: "api.v.vote",
      scope: "web-vote",
      limited: true,
      retryAfterSeconds: 30,
    });
    const parsed = JSON.parse(info.mock.calls[0]![0] as string) as Record<
      string,
      unknown
    >;
    expect(parsed.rateLimit).toBe(true);
    expect(parsed.limited).toBe(true);
    expect(parsed.retryAfterSeconds).toBe(30);
    info.mockRestore();
  });
});

describe("logDashCardQrFailure", () => {
  it("logs code prefix only, not full vehicle entry code", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    logDashCardQrFailure({
      kind: "vote",
      vehicleEntryCode: "AXY-004",
      error: new Error("svg failed"),
    });
    const parsed = JSON.parse(warn.mock.calls[0]![0] as string) as Record<
      string,
      unknown
    >;
    expect(parsed.dashCardQr).toBe(true);
    expect(parsed.codePrefix).toBe("AXY");
    expect(JSON.stringify(parsed)).not.toContain("AXY-004");
    warn.mockRestore();
  });
});
