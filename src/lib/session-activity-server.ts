import type { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  SESSION_ACTIVITY_COOKIE,
  SESSION_ACTIVITY_COOKIE_MAX_AGE_SECONDS,
  SESSION_ACTIVITY_DB_THROTTLE_MS,
  SESSION_IDLE_PAUSE_COOKIE,
  SESSION_STRIPE_PAUSE_MINUTES,
} from "@/lib/session-idle-config";
import {
  getIdleTimeoutMs,
  getIdleWarningMs,
  isIdleExpired,
  parseActivityTimestamp,
} from "@/lib/session-idle";

export {
  idleExcludedPath,
  isBackgroundSessionRequest,
  shouldTouchSessionActivity,
} from "@/lib/session-activity-policy";

const MS_PER_MINUTE = 60 * 1000;

export type SessionActivityCheck = {
  expired: boolean;
  lastActivityAtMs: number | null;
  paused: boolean;
};

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function readActivityCookie(request: NextRequest): number | null {
  return parseActivityTimestamp(
    request.cookies.get(SESSION_ACTIVITY_COOKIE)?.value,
  );
}

export function readPauseCookie(request: NextRequest): number | null {
  return parseActivityTimestamp(
    request.cookies.get(SESSION_IDLE_PAUSE_COOKIE)?.value,
  );
}

export function isIdlePauseActive(request: NextRequest, nowMs = Date.now()): boolean {
  const pausedUntil = readPauseCookie(request);
  return pausedUntil !== null && pausedUntil > nowMs;
}

export function checkSessionIdle(
  request: NextRequest,
  nowMs = Date.now(),
): SessionActivityCheck {
  if (isIdlePauseActive(request, nowMs)) {
    return {
      expired: false,
      lastActivityAtMs: readActivityCookie(request),
      paused: true,
    };
  }

  const lastActivityAtMs = readActivityCookie(request);
  if (lastActivityAtMs === null) {
    return { expired: false, lastActivityAtMs: null, paused: false };
  }

  return {
    expired: isIdleExpired(lastActivityAtMs, nowMs),
    lastActivityAtMs,
    paused: false,
  };
}

export function setActivityCookie(
  response: NextResponse,
  timestampMs = Date.now(),
): void {
  response.cookies.set(
    SESSION_ACTIVITY_COOKIE,
    String(timestampMs),
    cookieOptions(SESSION_ACTIVITY_COOKIE_MAX_AGE_SECONDS),
  );
}

/** Resolve last activity from cookie, then optional DB fallback — never "now". */
export function resolveLastActivityAtMs(
  cookieValue: string | undefined | null,
  dbLastActivityAt?: Date | null,
): number | null {
  const fromCookie = parseActivityTimestamp(cookieValue);
  if (fromCookie !== null) return fromCookie;
  const dbMs = dbLastActivityAt?.getTime();
  return dbMs != null && Number.isFinite(dbMs) && dbMs > 0 ? dbMs : null;
}

export type SessionActivityStatus =
  | { kind: "missing" }
  | { kind: "expired"; lastActivityAtMs: number }
  | {
      kind: "active";
      lastActivityAtMs: number;
      payload: ReturnType<typeof sessionActivityPayload>;
    };

export function buildSessionActivityStatus(
  lastActivityAtMs: number | null,
  nowMs = Date.now(),
): SessionActivityStatus {
  if (lastActivityAtMs === null) {
    return { kind: "missing" };
  }

  const payload = sessionActivityPayload(lastActivityAtMs, nowMs);
  if (payload.msUntilExpiry <= 0) {
    return { kind: "expired", lastActivityAtMs };
  }

  return { kind: "active", lastActivityAtMs, payload };
}

export function clearActivityCookies(response: NextResponse): void {
  response.cookies.set(SESSION_ACTIVITY_COOKIE, "", {
    ...cookieOptions(0),
    maxAge: 0,
  });
  response.cookies.set(SESSION_IDLE_PAUSE_COOKIE, "", {
    ...cookieOptions(0),
    maxAge: 0,
  });
}

export function setIdlePauseCookie(
  response: NextResponse,
  pauseMinutes = SESSION_STRIPE_PAUSE_MINUTES,
): void {
  const pausedUntil = Date.now() + pauseMinutes * MS_PER_MINUTE;
  response.cookies.set(
    SESSION_IDLE_PAUSE_COOKIE,
    String(pausedUntil),
    cookieOptions(pauseMinutes * 60),
  );
}

/** Throttled Prisma write — best-effort, never blocks the request. */
export async function touchUserLastActivityDb(
  userId: string,
  lastActivityAtMs: number,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastActivityAt: true },
    });
    if (!user) return;

    const previousMs = user.lastActivityAt?.getTime() ?? 0;
    if (lastActivityAtMs - previousMs < SESSION_ACTIVITY_DB_THROTTLE_MS) {
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { lastActivityAt: new Date(lastActivityAtMs) },
    });
  } catch (e) {
    console.error("[session-activity] touchUserLastActivityDb", e);
  }
}

export function sessionActivityPayload(lastActivityAtMs: number, nowMs = Date.now()) {
  const expiresAtMs = lastActivityAtMs + getIdleTimeoutMs();
  return {
    lastActivityAt: lastActivityAtMs,
    expiresAt: expiresAtMs,
    idleMs: nowMs - lastActivityAtMs,
    msUntilExpiry: Math.max(0, expiresAtMs - nowMs),
    warningAtMs: lastActivityAtMs + getIdleWarningMs(),
  };
}
