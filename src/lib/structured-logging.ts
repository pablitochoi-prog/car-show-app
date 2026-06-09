/**
 * Safe structured logging for Vercel stdout (JSON lines, no PII).
 */

import { vehicleEntryCodePrefix } from "@/lib/perf-timing";

export type StructuredLogMeta = Record<
  string,
  string | number | boolean | null | undefined
>;

function compactMeta(meta: StructuredLogMeta): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined || value === null) continue;
    out[key] = value;
  }
  return out;
}

/** @internal Exported for Sentry context attachment. */
export function compactStructuredMeta(
  meta: StructuredLogMeta,
): Record<string, string | number | boolean> {
  return compactMeta(meta);
}

/** Strip emails, phones, and long opaque tokens from error messages. */
export function sanitizeErrorMessage(message: string): string {
  let s = message.trim();
  if (!s) return "Error";
  s = s.replace(
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    "[email]",
  );
  s = s.replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[phone]");
  s = s.replace(/\bsk_(live|test)_[A-Za-z0-9]+\b/gi, "[stripe_secret]");
  s = s.replace(/\bpi_[A-Za-z0-9]+\b/gi, "[payment_intent]");
  s = s.replace(/\bcs_(live|test)_[A-Za-z0-9]+\b/gi, "[checkout_session]");
  // Redact JWT-shaped strings (Supabase access tokens, service role keys, etc.)
  // Pattern: three base64url segments separated by dots, first segment starts with "eyJ".
  s = s.replace(
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
    "[token]",
  );
  if (s.length > 240) s = `${s.slice(0, 237)}...`;
  return s;
}

/** Safe error fields for structured logs — never pass raw Error objects. */
export function sanitizeErrorForLog(error: unknown): {
  errorType: string;
  errorMessage: string;
} {
  if (error instanceof Error) {
    return {
      errorType: error.name || "Error",
      errorMessage: sanitizeErrorMessage(error.message),
    };
  }
  if (typeof error === "string") {
    return { errorType: "Error", errorMessage: sanitizeErrorMessage(error) };
  }
  return { errorType: "Error", errorMessage: "Unknown error" };
}

function emitStructuredLog(
  level: "info" | "warn" | "error",
  payload: Record<string, unknown>,
): void {
  const line = JSON.stringify(payload);
  if (level === "info") console.info(line);
  else if (level === "warn") console.warn(line);
  else console.error(line);
}

export function logBackgroundTask(args: {
  name: string;
  route: string;
  eventId?: string;
  registrationId?: string;
  durationMs: number;
  success: boolean;
  error?: unknown;
}): void {
  const { error, ...rest } = args;
  const payload: Record<string, unknown> = {
    backgroundTask: true,
    ...compactMeta(rest),
  };
  if (!args.success && error !== undefined) {
    Object.assign(payload, sanitizeErrorForLog(error));
  }
  emitStructuredLog(args.success ? "info" : "error", payload);
}

export function logRateLimitEvent(args: {
  route: string;
  scope: string;
  limited: boolean;
  retryAfterSeconds?: number;
}): void {
  emitStructuredLog("info", {
    rateLimit: true,
    route: args.route,
    scope: args.scope,
    limited: args.limited,
    ...(args.retryAfterSeconds != null
      ? { retryAfterSeconds: args.retryAfterSeconds }
      : {}),
  });
}

export function logDashCardQrFailure(args: {
  kind: "vote" | "sale";
  vehicleEntryCode: string;
  error: unknown;
}): void {
  emitStructuredLog("warn", {
    dashCardQr: true,
    kind: args.kind,
    codePrefix: vehicleEntryCodePrefix(args.vehicleEntryCode) ?? "unknown",
    ...sanitizeErrorForLog(args.error),
  });
}

const VEHICLE_ENTRY_INDEX_ANOMALY_PATHS = new Set([
  "vehicle_entry_index_miss",
  "vehicle_entry_index_stale_fallback",
]);

export function isVehicleEntryIndexAnomalyLookupPath(
  lookupPath: string | undefined,
): boolean {
  return lookupPath != null && VEHICLE_ENTRY_INDEX_ANOMALY_PATHS.has(lookupPath);
}

export function logVehicleEntryIndexAnomaly(args: {
  lookupPath: string;
  codePrefix?: string;
  eventId?: string;
  guestRegCount?: number;
}): void {
  emitStructuredLog("warn", {
    vehicleEntryIndex: true,
    lookupPath: args.lookupPath,
    ...compactMeta({
      codePrefix: args.codePrefix,
      eventId: args.eventId,
      guestRegCount: args.guestRegCount,
    }),
  });
}

export function logObservabilityError(args: {
  source: string;
  error: unknown;
  meta?: StructuredLogMeta;
}): void {
  emitStructuredLog("error", {
    observability: true,
    source: args.source,
    ...compactMeta(args.meta ?? {}),
    ...sanitizeErrorForLog(args.error),
  });
}
