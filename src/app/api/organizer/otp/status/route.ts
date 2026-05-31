import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import { maskEmail } from "@/lib/step-up-crypto";
import { STEP_UP_PURPOSE_ORGANIZER } from "@/lib/step-up-config";
import { getOtpStatus } from "@/lib/step-up-otp";
import {
  isStepUpValidForSession,
  readStepUpCookieFromStore,
} from "@/lib/step-up-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** OTP challenge status for the verify-otp UI. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isSiteAdmin(user)) {
    return NextResponse.json({
      isAdmin: true,
      verified: true,
      maskedEmail: null,
      resendAvailableAt: null,
      hasActiveChallenge: false,
      emailSent: false,
    });
  }

  const cookie = await readStepUpCookieFromStore();
  const verified = isStepUpValidForSession(cookie, user.id, null);

  const status = await getOtpStatus({
    userId: user.id,
    purpose: STEP_UP_PURPOSE_ORGANIZER,
  });

  return NextResponse.json({
    isAdmin: false,
    verified,
    maskedEmail: maskEmail(user.email),
    resendAvailableAt: status.resendAvailableAt?.toISOString() ?? null,
    hasActiveChallenge: status.hasActiveChallenge,
    emailSent: status.emailSent,
  });
}
