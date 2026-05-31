import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getMfaSessionState,
  mfaEnrollErrorMessage,
  removeUnverifiedTotpFactors,
  totpQrCodeDataUrl,
} from "@/lib/mfa-session";
import { isSiteAdmin } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSiteAdmin(user)) {
    return NextResponse.json(
      { error: "Authenticator MFA is only available for site admins." },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const mfa = await getMfaSessionState(supabase);

  if (mfa.hasVerifiedTotp) {
    return NextResponse.json(
      { error: "Authenticator app is already enabled. Disable it first to re-enroll." },
      { status: 400 },
    );
  }

  const cleanup = await removeUnverifiedTotpFactors(supabase);
  if (cleanup.errors.length > 0) {
    console.warn("[mfa/enroll] cleanup", cleanup.errors.join("; "));
  }

  let { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "CarShowScout Admin",
  });

  if (error) {
    const retryCleanup = await removeUnverifiedTotpFactors(supabase);
    if (retryCleanup.removed.length > 0) {
      ({ data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "CarShowScout Admin",
      }));
    }
  }

  if (error || !data || data.type !== "totp" || !data.totp) {
    console.error("[mfa/enroll]", error?.message ?? "missing totp payload");
    return NextResponse.json(
      { error: mfaEnrollErrorMessage(error?.message) },
      { status: 400 },
    );
  }

  return NextResponse.json({
    factorId: data.id,
    qrCodeDataUrl: totpQrCodeDataUrl(data.totp.qr_code),
  });
}
