import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildRateLimitKey,
  buildTwilioInboundRateLimitSenderKey,
  checkGuestRegistrationRateLimit,
  checkMemberRegistrationRateLimit,
  checkRateLimit,
  checkWebVoteRateLimit,
  clearRateLimitStoreForTests,
  hashRateLimitKey,
  isPublicRateLimitEnabled,
  rateLimitJsonResponse,
  type RateLimitStore,
} from "./rate-limit";

describe("isPublicRateLimitEnabled", () => {
  const original = process.env.PUBLIC_RATE_LIMIT_ENABLED;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.PUBLIC_RATE_LIMIT_ENABLED;
    } else {
      process.env.PUBLIC_RATE_LIMIT_ENABLED = original;
    }
  });

  it("defaults to enabled", () => {
    delete process.env.PUBLIC_RATE_LIMIT_ENABLED;
    expect(isPublicRateLimitEnabled()).toBe(true);
  });

  it("disables when env is false", () => {
    process.env.PUBLIC_RATE_LIMIT_ENABLED = "false";
    expect(isPublicRateLimitEnabled()).toBe(false);
  });
});

describe("checkRateLimit", () => {
  let store: RateLimitStore;

  beforeEach(() => {
    store = new Map();
    process.env.PUBLIC_RATE_LIMIT_ENABLED = "true";
  });

  afterEach(() => {
    clearRateLimitStoreForTests(store);
    delete process.env.PUBLIC_RATE_LIMIT_ENABLED;
  });

  it("allows requests under the limit", () => {
    const result = checkRateLimit({
      key: "test:allowed",
      limit: 2,
      windowMs: 60_000,
      now: 1_000_000,
      store,
    });
    expect(result).toEqual({ ok: true });
  });

  it("blocks when limit is exceeded and returns retryAfterSeconds", () => {
    const config = { key: "test:blocked", limit: 2, windowMs: 60_000, store };
    expect(checkRateLimit({ ...config, now: 1_000_000 })).toEqual({ ok: true });
    expect(checkRateLimit({ ...config, now: 1_000_100 })).toEqual({ ok: true });

    const denied = checkRateLimit({ ...config, now: 1_000_200 });
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("does not include raw PII in keys", () => {
    const ip = "203.0.113.10";
    const key = buildRateLimitKey(["guest-register", "evt-1", hashRateLimitKey(ip)]);
    expect(key).not.toContain(ip);
    expect(key).toContain("guest-register");
  });

  it("bypasses limits when disabled", () => {
    process.env.PUBLIC_RATE_LIMIT_ENABLED = "false";
    const config = { key: "test:disabled", limit: 1, windowMs: 60_000, store };
    expect(checkRateLimit({ ...config, now: 1 })).toEqual({ ok: true });
    expect(checkRateLimit({ ...config, now: 2 })).toEqual({ ok: true });
  });
});

describe("rateLimitJsonResponse", () => {
  it("returns 429 with Retry-After header", () => {
    const res = rateLimitJsonResponse({
      ok: false,
      retryAfterSeconds: 42,
      error: "Too many requests. Please try again later.",
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("42");
  });
});

describe("endpoint-specific limiters", () => {
  let store: RateLimitStore;

  beforeEach(() => {
    store = new Map();
    process.env.PUBLIC_RATE_LIMIT_ENABLED = "true";
  });

  afterEach(() => {
    clearRateLimitStoreForTests(store);
    delete process.env.PUBLIC_RATE_LIMIT_ENABLED;
  });

  function requestWithIp(ip: string): Request {
    return new Request("https://example.com", {
      headers: { "x-forwarded-for": ip },
    });
  }

  it("limits guest registration by IP and event", () => {
    const req = requestWithIp("203.0.113.20");
    const args = {
      eventId: "evt-1",
      request: req,
      store,
      now: 5_000_000,
    };

    for (let i = 0; i < 10; i++) {
      expect(checkGuestRegistrationRateLimit(args).ok).toBe(true);
    }
    expect(checkGuestRegistrationRateLimit(args).ok).toBe(false);
  });

  it("limits member registration by user id", () => {
    const req = requestWithIp("203.0.113.21");
    const args = {
      eventId: "evt-1",
      userId: "user-1",
      request: req,
      store,
      now: 5_000_000,
    };

    for (let i = 0; i < 10; i++) {
      expect(checkMemberRegistrationRateLimit(args).ok).toBe(true);
    }
    expect(checkMemberRegistrationRateLimit(args).ok).toBe(false);
  });

  it("limits web voting by code prefix and IP", () => {
    const req = requestWithIp("203.0.113.22");
    const args = {
      vehicleEntryCode: "AXY-004",
      request: req,
      store,
      now: 5_000_000,
    };

    for (let i = 0; i < 30; i++) {
      expect(checkWebVoteRateLimit(args).ok).toBe(true);
    }
    expect(checkWebVoteRateLimit(args).ok).toBe(false);
  });
});

describe("buildTwilioInboundRateLimitSenderKey", () => {
  it("prefers hashed phone when secret is configured", () => {
    vi.stubEnv("SMS_PHONE_HASH_SECRET", "test-secret");
    const key = buildTwilioInboundRateLimitSenderKey(
      {
        provider: "twilio",
        from: "+16195551212",
        to: "+18005550100",
        body: "AXY-001",
        providerMessageId: "SM123",
        rawPayload: {},
      },
      new Request("https://example.com"),
    );
    expect(key).not.toContain("619");
    expect(key).not.toContain("555");
    vi.unstubAllEnvs();
  });

  it("falls back to hashed message id when phone hash is unavailable", () => {
    delete process.env.SMS_PHONE_HASH_SECRET;
    const key = buildTwilioInboundRateLimitSenderKey(
      {
        provider: "twilio",
        from: "+16195551212",
        to: "+18005550100",
        body: "AXY-001",
        providerMessageId: "SM123",
        rawPayload: {},
      },
      new Request("https://example.com"),
    );
    expect(key.startsWith("sid:")).toBe(true);
    expect(key).not.toContain("SM123");
  });
});
