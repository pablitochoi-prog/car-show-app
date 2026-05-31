import type { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  STEP_UP_COOKIE_NAME,
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
    maxAge: 60 * 60 * 24,
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

export function isStepUpValidForSession(
  payload: StepUpCookiePayload | null,
  userId: string,
  _sessionId?: string | null,
): boolean {
  if (!payload) return false;
  // Bind to app user id; cookie is cleared on logout and idle timeout.
  return payload.userId === userId;
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
