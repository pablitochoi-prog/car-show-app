/**
 * Shared Sentry init options and safe capture helpers.
 * Disabled when SENTRY_DSN is unset or SENTRY_ENABLED=false.
 */

import * as Sentry from "@sentry/nextjs";
import type { StructuredLogMeta } from "@/lib/structured-logging";
import { compactStructuredMeta } from "@/lib/structured-logging";

export function getSentryEnvironment(): string {
  return (
    process.env.SENTRY_ENVIRONMENT?.trim() ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    "development"
  );
}

export function parseSentrySampleRate(
  envName: string,
  fallback: number,
): number {
  const raw = process.env[envName]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return fallback;
  return parsed;
}

export function isSentryEnabled(): boolean {
  const disabled = process.env.SENTRY_ENABLED?.trim().toLowerCase();
  if (disabled === "false" || disabled === "0" || disabled === "no") {
    return false;
  }
  return Boolean(process.env.SENTRY_DSN?.trim());
}

/** Options shared by server, edge, and client Sentry init. */
export function buildSentryInitOptions() {
  return {
    dsn: process.env.SENTRY_DSN,
    enabled: isSentryEnabled(),
    environment: getSentryEnvironment(),
    tracesSampleRate: parseSentrySampleRate("SENTRY_TRACES_SAMPLE_RATE", 0.05),
    profilesSampleRate: parseSentrySampleRate(
      "SENTRY_PROFILES_SAMPLE_RATE",
      0,
    ),
    sendDefaultPii: false,
  } as const;
}

export function captureObservabilityException(
  error: unknown,
  context?: StructuredLogMeta,
): void {
  if (!isSentryEnabled()) return;

  Sentry.withScope((scope) => {
    if (context) {
      for (const [key, value] of Object.entries(compactStructuredMeta(context))) {
        scope.setExtra(key, value);
      }
    }
    Sentry.captureException(error);
  });
}
