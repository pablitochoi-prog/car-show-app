import type { User } from "@prisma/client";
import { sendOrganizerStepUpOtpEmail } from "@/lib/email/sendgrid";
import {
  STEP_UP_OTP_EXPIRY_MINUTES,
  STEP_UP_PURPOSE_ORGANIZER,
} from "@/lib/step-up-config";
import { deliverOrganizerOtpIfNeeded, getOtpStatus } from "@/lib/step-up-otp";

export type OrganizerOtpDeliveryState = {
  emailSent: boolean;
  maskedEmail: string;
  resendAvailableAt: string | null;
  sendError: string | null;
};

/** Ensure an organizer OTP email is queued when the verify page loads. */
export async function ensureOrganizerOtpOnPageLoad(
  user: Pick<User, "id" | "email" | "name">,
): Promise<OrganizerOtpDeliveryState> {
  const delivery = await deliverOrganizerOtpIfNeeded({
    userId: user.id,
    purpose: STEP_UP_PURPOSE_ORGANIZER,
    sendEmail: async (code) => {
      const send = await sendOrganizerStepUpOtpEmail({
        to: user.email,
        recipientName: user.name,
        code,
        expiresInMinutes: STEP_UP_OTP_EXPIRY_MINUTES,
      });
      if (!send.sent) {
        console.error("[organizer-otp/delivery]", send);
      }
      return send.sent;
    },
  });

  const status = await getOtpStatus({
    userId: user.id,
    purpose: STEP_UP_PURPOSE_ORGANIZER,
  });

  let sendError: string | null = null;
  if (delivery.action === "failed") {
    sendError =
      delivery.reason === "EMAIL_NOT_VERIFIED"
        ? "Verify your email address before continuing."
        : "Could not send verification code. Try resend below.";
  }

  return {
    emailSent: status.emailSent,
    maskedEmail: user.email,
    resendAvailableAt: status.resendAvailableAt?.toISOString() ?? null,
    sendError,
  };
}
