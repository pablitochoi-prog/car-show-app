import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import { createSupabaseForResponse } from "@/lib/supabase/route-handler";
import { getSupabaseSessionBinding } from "@/lib/supabase-session-binding";
import { STEP_UP_PURPOSE_ORGANIZER } from "@/lib/step-up-config";
import { verifyOtpChallenge } from "@/lib/step-up-otp";
import { writeStepUpAuditLog } from "@/lib/step-up-audit";
import { setStepUpCookie } from "@/lib/step-up-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const verifySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
});

function requestMeta(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}

/** Verify organizer email OTP and set step-up cookie for this login session. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isSiteAdmin(user)) {
    return NextResponse.json(
      { error: "Site admins verify with authenticator MFA, not email OTP." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid code";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const draft = NextResponse.json({ ok: true });
  const supabase = await createSupabaseForResponse(draft);
  const sessionId = await getSupabaseSessionBinding(supabase);

  if (!sessionId) {
    return NextResponse.json(
      { error: "Session expired. Sign in again." },
      { status: 401 },
    );
  }

  const meta = requestMeta(request);
  const result = await verifyOtpChallenge({
    userId: user.id,
    purpose: STEP_UP_PURPOSE_ORGANIZER,
    code: parsed.data.code,
  });

  if (!result.ok) {
    const action =
      result.reason === "EXPIRED"
        ? "OTP_EXPIRED"
        : result.reason === "LOCKED" || result.reason === "INVALID"
          ? "OTP_FAILED"
          : "OTP_FAILED";

    await writeStepUpAuditLog({
      userId: user.id,
      purpose: "ORGANIZER_STEP_UP",
      action,
      route: "/api/organizer/otp/verify",
      ...meta,
    });

    const messages: Record<typeof result.reason, string> = {
      NOT_FOUND: "No active verification code. Request a new one.",
      EXPIRED: "This code has expired. Request a new one.",
      LOCKED: "Too many attempts. Request a new code.",
      INVALID: "Invalid code. Try again.",
    };

    return NextResponse.json(
      { error: messages[result.reason] },
      { status: result.reason === "LOCKED" ? 429 : 401 },
    );
  }

  await writeStepUpAuditLog({
    userId: user.id,
    purpose: "ORGANIZER_STEP_UP",
    action: "OTP_VERIFIED",
    route: "/api/organizer/otp/verify",
    ...meta,
  });

  setStepUpCookie(draft, {
    userId: user.id,
    sessionId,
    purpose: STEP_UP_PURPOSE_ORGANIZER,
  });

  return draft;
}
