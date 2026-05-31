import { NextResponse } from "next/server";
import type { InboundSmsMessage } from "@/lib/sms/types";
import { hashPhoneNumber } from "@/lib/sms/hash-phone";
import { vehicleEntryCodePrefix } from "@/lib/perf-timing";
import { hashSaleInquiryClientValue } from "@/lib/vehicle-sale-inquiry-client-hash";

/** Sliding-window attempt timestamps keyed by opaque limiter key (no PII). */
export type RateLimitStore = Map<string, number[]>;

const defaultStore: RateLimitStore = new Map();

export type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

export type RateLimitDenied = {
  ok: false;
  retryAfterSeconds: number;
  error: string;
};

export type RateLimitCheckResult = { ok: true } | RateLimitDenied;

export const PUBLIC_RATE_LIMIT_DEFAULTS = {
  guestRegister: { limit: 10, windowMs: 10 * 60 * 1000 },
  memberRegister: { limit: 10, windowMs: 10 * 60 * 1000 },
  webVote: { limit: 30, windowMs: 60 * 1000 },
  twilioInbound: { limit: 30, windowMs: 10 * 60 * 1000 },
} as const;

/** Enabled by default; set PUBLIC_RATE_LIMIT_ENABLED=false to disable all public limits. */
export function isPublicRateLimitEnabled(): boolean {
  const raw = process.env.PUBLIC_RATE_LIMIT_ENABLED;
  if (raw === undefined || raw.trim() === "") return true;
  return !["0", "false", "no", "off"].includes(raw.trim().toLowerCase());
}

function envPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolvePublicRateLimitConfig(
  kind: keyof typeof PUBLIC_RATE_LIMIT_DEFAULTS,
): RateLimitConfig {
  const defaults = PUBLIC_RATE_LIMIT_DEFAULTS[kind];
  const prefix = `PUBLIC_RATE_LIMIT_${kind.replace(/([A-Z])/g, "_$1").toUpperCase()}`;
  return {
    limit: envPositiveInt(`${prefix}_LIMIT`, defaults.limit),
    windowMs: envPositiveInt(`${prefix}_WINDOW_MS`, defaults.windowMs),
  };
}

/** Truncated SHA-256 for IP / opaque identifiers — never store raw values in keys or logs. */
export function hashRateLimitKey(value: string): string {
  return hashSaleInquiryClientValue(value);
}

export function resolveClientIp(request: Request): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    null
  );
}

export function buildRateLimitKey(parts: string[]): string {
  return parts.filter(Boolean).join(":");
}

export function checkRateLimit(args: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
  store?: RateLimitStore;
}): RateLimitCheckResult {
  if (!isPublicRateLimitEnabled()) {
    return { ok: true };
  }

  const store = args.store ?? defaultStore;
  const now = args.now ?? Date.now();
  const windowStart = now - args.windowMs;

  const prior = store.get(args.key) ?? [];
  const active = prior.filter((timestamp) => timestamp > windowStart);

  if (active.length >= args.limit) {
    const oldest = active[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + args.windowMs - now) / 1000),
    );
    return {
      ok: false,
      retryAfterSeconds,
      error: "Too many requests. Please try again later.",
    };
  }

  active.push(now);
  store.set(args.key, active);
  return { ok: true };
}

export function logRateLimitBlock(args: {
  route: string;
  scope: string;
  retryAfterSeconds: number;
}): void {
  console.info(
    JSON.stringify({
      rateLimit: true,
      route: args.route,
      scope: args.scope,
      retryAfterSeconds: args.retryAfterSeconds,
    }),
  );
}

export function rateLimitJsonResponse(denied: RateLimitDenied): NextResponse {
  return NextResponse.json(
    { error: denied.error },
    {
      status: 429,
      headers: { "Retry-After": String(denied.retryAfterSeconds) },
    },
  );
}

export function enforcePublicRateLimit(args: {
  route: string;
  scope: string;
  key: string;
  config: RateLimitConfig;
  store?: RateLimitStore;
  now?: number;
}): NextResponse | null {
  const result = checkRateLimit({
    key: args.key,
    limit: args.config.limit,
    windowMs: args.config.windowMs,
    store: args.store,
    now: args.now,
  });

  if (result.ok) return null;

  logRateLimitBlock({
    route: args.route,
    scope: args.scope,
    retryAfterSeconds: result.retryAfterSeconds,
  });
  return rateLimitJsonResponse(result);
}

export function checkGuestRegistrationRateLimit(args: {
  eventId: string;
  request: Request;
  store?: RateLimitStore;
  now?: number;
}): RateLimitCheckResult {
  const ip = resolveClientIp(args.request);
  const key = buildRateLimitKey([
    "guest-register",
    args.eventId,
    ip ? hashRateLimitKey(ip) : "no-ip",
  ]);
  return checkRateLimit({
    key,
    ...resolvePublicRateLimitConfig("guestRegister"),
    store: args.store,
    now: args.now,
  });
}

export function checkMemberRegistrationRateLimit(args: {
  eventId: string;
  userId: string;
  request: Request;
  store?: RateLimitStore;
  now?: number;
}): RateLimitCheckResult {
  const ip = resolveClientIp(args.request);
  const identity = args.userId || (ip ? hashRateLimitKey(ip) : "no-ip");
  const key = buildRateLimitKey(["member-register", args.eventId, identity]);
  return checkRateLimit({
    key,
    ...resolvePublicRateLimitConfig("memberRegister"),
    store: args.store,
    now: args.now,
  });
}

export function checkWebVoteRateLimit(args: {
  vehicleEntryCode: string;
  request: Request;
  store?: RateLimitStore;
  now?: number;
}): RateLimitCheckResult {
  const ip = resolveClientIp(args.request);
  const codePrefix = vehicleEntryCodePrefix(args.vehicleEntryCode) || "unknown";
  const key = buildRateLimitKey([
    "web-vote",
    codePrefix,
    ip ? hashRateLimitKey(ip) : "no-ip",
  ]);
  return checkRateLimit({
    key,
    ...resolvePublicRateLimitConfig("webVote"),
    store: args.store,
    now: args.now,
  });
}

/** Opaque sender key for Twilio inbound — hashed phone, message id, or IP fallback. */
export function buildTwilioInboundRateLimitSenderKey(
  inbound: InboundSmsMessage,
  request: Request,
): string {
  if (inbound.from?.trim()) {
    try {
      return hashPhoneNumber(inbound.from.trim());
    } catch {
      // Fall through when SMS_PHONE_HASH_SECRET is unavailable in dev.
    }
  }

  if (inbound.providerMessageId?.trim()) {
    return `sid:${hashRateLimitKey(inbound.providerMessageId.trim())}`;
  }

  const ip = resolveClientIp(request);
  return ip ? hashRateLimitKey(ip) : "unknown";
}

export function checkTwilioInboundRateLimit(args: {
  inbound: InboundSmsMessage;
  request: Request;
  store?: RateLimitStore;
  now?: number;
}): RateLimitCheckResult {
  const senderKey = buildTwilioInboundRateLimitSenderKey(
    args.inbound,
    args.request,
  );
  const key = buildRateLimitKey(["twilio-inbound", senderKey]);
  return checkRateLimit({
    key,
    ...resolvePublicRateLimitConfig("twilioInbound"),
    store: args.store,
    now: args.now,
  });
}

/** Test helper — clears the in-memory store between tests. */
export function clearRateLimitStoreForTests(
  store: RateLimitStore = defaultStore,
): void {
  store.clear();
}
