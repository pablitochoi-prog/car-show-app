import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sendOrganizerStepUpOtpEmail } from "@/lib/email/sendgrid";
import { isSiteAdmin } from "@/lib/permissions";
import {
  STEP_UP_OTP_EXPIRY_MINUTES,
  STEP_UP_PURPOSE_ORGANIZER,
} from "@/lib/step-up-config";
import { deliverOrganizerOtpIfNeeded } from "@/lib/step-up-otp";
import { writeStepUpAuditLog } from "@/lib/step-up-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requestMeta(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}

/** Send or resend organizer email OTP (staff only — site admins use MFA). */
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

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email_confirmed_at) {
    return NextResponse.json(
      { error: "Verify your email address before continuing." },
      { status: 400 },
    );
  }

  const meta = requestMeta(request);
  const email = user.email.trim().toLowerCase();

  const delivery = await deliverOrganizerOtpIfNeeded({
    userId: user.id,
    purpose: STEP_UP_PURPOSE_ORGANIZER,
    sendEmail: async (code) => {
      const send = await sendOrganizerStepUpOtpEmail({
        to: email,
        recipientName: user.name,
        code,
        expiresInMinutes: STEP_UP_OTP_EXPIRY_MINUTES,
      });
      if (!send.sent) {
        console.error("[organizer-otp/send]", send);
      }
      return send.sent;
    },
  });

  if (delivery.action === "sent") {
    await writeStepUpAuditLog({
      userId: user.id,
      purpose: "ORGANIZER_STEP_UP",
      action: "OTP_REQUESTED",
      route: "/api/organizer/otp/send",
      ...meta,
    });

    return NextResponse.json({
      ok: true,
      expiresAt: delivery.result.expiresAt.toISOString(),
      resendAvailableAt: delivery.result.resendAvailableAt.toISOString(),
    });
  }

  if (delivery.action === "skipped" && delivery.reason === "rate_limited") {
    await writeStepUpAuditLog({
      userId: user.id,
      purpose: "ORGANIZER_STEP_UP",
      action: "OTP_RATE_LIMITED",
      route: "/api/organizer/otp/send",
      ...meta,
    });
    return NextResponse.json(
      {
        error: "Please wait before requesting another code.",
        resendAvailableAt: delivery.resendAvailableAt?.toISOString() ?? null,
      },
      { status: 429 },
    );
  }

  if (delivery.action === "skipped" && delivery.reason === "active") {
    return NextResponse.json({
      ok: true,
      alreadySent: true,
      resendAvailableAt: delivery.resendAvailableAt?.toISOString() ?? null,
    });
  }

  if (delivery.reason === "EMAIL_NOT_VERIFIED") {
    return NextResponse.json(
      { error: "Verify your email address before continuing." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { error: "Could not send verification code. Try again later." },
    { status: 503 },
  );
}
