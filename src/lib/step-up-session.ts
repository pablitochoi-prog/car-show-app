import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  STEP_UP_COOKIE_NAME,
  STEP_UP_FRESHNESS_MS,
  STEP_UP_MAX_AGE_SECONDS,
  STEP_UP_PURPOSE_ORGANIZER,
  type StepUpPurpose,
} from "@/lib/step-up-config";
import {
  signStepUpCookie,
  verifyStepUpCookie,
  type StepUpCookiePayload,
} from "@/lib/step-up-crypto";
import { clearStepUpCookie as clearStepUpCookieEdge } from "@/lib/step-up-cookie-edge";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: STEP_UP_MAX_AGE_SECONDS,
  };
}

export function readStepUpCookieFromRequest(
  request: NextRequest,
  purpose: StepUpPurpose = STEP_UP_PURPOSE_ORGANIZER,
): StepUpCookiePayload | null {
  const raw = request.cookies.get(STEP_UP_COOKIE_NAME)?.value;
  const payload = verifyStepUpCookie(raw);
  if (!payload || payload.purpose !== purpose) return null;
  return payload;
}

export async function readStepUpCookieFromStore(
  purpose: StepUpPurpose = STEP_UP_PURPOSE_ORGANIZER,
): Promise<StepUpCookiePayload | null> {
  const store = await cookies();
  const raw = store.get(STEP_UP_COOKIE_NAME)?.value;
  const payload = verifyStepUpCookie(raw);
  if (!payload || payload.purpose !== purpose) return null;
  return payload;
}

/** True when the cookie's verifiedAt is within the server-side freshness window. */
function isStepUpFresh(verifiedAt: number, now: number = Date.now()): boolean {
  if (typeof verifiedAt !== "number" || !Number.isFinite(verifiedAt) || verifiedAt <= 0) {
    return false;
  }
  // verifiedAt is HMAC-signed (server-set), so a future value cannot be forged;
  // only reject when the cookie is older than the freshness window.
  return now - verifiedAt <= STEP_UP_FRESHNESS_MS;
}

/**
 * Validate a step-up cookie payload against the current user and login session.
 * - Binds to the app user id.
 * - When `sessionId` is provided (non-null), the cookie must have been minted
 *   for that exact Supabase login session (rejects reuse across sessions).
 * - Enforces the `verifiedAt` freshness window server-side.
 */
export function isStepUpValidForSession(
  payload: StepUpCookiePayload | null,
  userId: string,
  sessionId?: string | null,
): boolean {
  if (!payload) return false;
  if (payload.userId !== userId) return false;
  if (sessionId && payload.sessionId !== sessionId) return false;
  if (!isStepUpFresh(payload.verifiedAt)) return false;
  return true;
}

export function setStepUpCookie(
  response: NextResponse,
  input: {
    userId: string;
    sessionId: string;
    purpose: StepUpPurpose;
  },
): void {
  const payload: StepUpCookiePayload = {
    userId: input.userId,
    sessionId: input.sessionId,
    purpose: input.purpose,
    verifiedAt: Date.now(),
  };
  response.cookies.set(
    STEP_UP_COOKIE_NAME,
    signStepUpCookie(payload),
    cookieOptions(),
  );
}

export function clearStepUpCookie(response: NextResponse): void {
  clearStepUpCookieEdge(response);
}

/** Supabase access token `session_id` claim — ties step-up to login session. */
export function getSupabaseSessionIdFromAccessToken(
  accessToken: string | undefined | null,
): string | null {
  if (!accessToken) return null;
  const parts = accessToken.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as { session_id?: string };
    return typeof payload.session_id === "string" ? payload.session_id : null;
  } catch {
    return null;
  }
}
