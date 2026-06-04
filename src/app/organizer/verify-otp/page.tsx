import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMfaSessionState } from "@/lib/mfa-session";
import { isSiteAdmin } from "@/lib/permissions";
import { safeInternalPath } from "@/lib/safe-internal-path";
import { ensureOrganizerOtpOnPageLoad } from "@/lib/organizer-otp-delivery";
import { maskEmail } from "@/lib/step-up-crypto";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizerVerifyOtpForm } from "@/components/organizer/organizer-verify-otp-form";
import {
  isStepUpValidForSession,
  readStepUpCookieFromStore,
} from "@/lib/step-up-session";

export default async function OrganizerVerifyOtpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; eventId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const next =
    safeInternalPath(sp.next ?? null) ??
    (sp.eventId
      ? `/organizer/events/${sp.eventId}/edit`
      : "/dashboard/events?tab=managing");

  if (isSiteAdmin(user)) {
    const supabase = await createClient();
    const mfa = await getMfaSessionState(supabase);
    if (mfa.hasVerifiedTotp && mfa.needsMfaVerification) {
      redirect(`/login/mfa?redirect=${encodeURIComponent(next)}`);
    }
    redirect(next);
  }

  const cookie = await readStepUpCookieFromStore();
  if (isStepUpValidForSession(cookie, user.id, null)) {
    redirect(next);
  }

  const delivery = await ensureOrganizerOtpOnPageLoad(user);

  return (
    <AuthPageShell>
      <Card>
        <CardHeader>
          <CardTitle>Verify your account</CardTitle>
        </CardHeader>
        <CardContent>
          <OrganizerVerifyOtpForm
            redirectTo={next}
            initialEmailSent={delivery.emailSent}
            initialMaskedEmail={maskEmail(delivery.maskedEmail)}
            initialResendAvailableAt={delivery.resendAvailableAt}
            initialSendError={delivery.sendError}
          />
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
