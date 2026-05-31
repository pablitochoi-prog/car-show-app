import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { getMfaSessionState } from "@/lib/mfa-session";
import { getAdminMfaGuardState } from "@/lib/admin-mfa-guards";
import { evaluateStaffStepUp } from "@/lib/require-organizer-step-up";
import { readStepUpCookieFromStore } from "@/lib/step-up-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Session guard flags for middleware (ban + admin MFA + staff step-up). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const pathname = url.searchParams.get("pathname") ?? "";
  const method = url.searchParams.get("method") ?? "GET";
  const searchRaw = url.searchParams.get("search") ?? "";
  const searchParams = searchRaw
    ? new URLSearchParams(
        searchRaw.startsWith("?") ? searchRaw.slice(1) : searchRaw,
      )
    : undefined;

  const supabase = await createClient();
  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!supabaseUser) {
    return NextResponse.json({
      status: null,
      platformRole: null,
      isAdmin: false,
      adminMfaEnrolled: false,
      adminMfaVerified: false,
      adminMfaChallengeRequired: false,
      adminMfaSetupWarning: false,
      staffStepUpRequired: false,
      staffStepUpVerified: true,
      staffStepUpAdminMfaRequired: false,
      staffStepUpEventId: null,
    });
  }

  const row = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
    select: { id: true, status: true, platformRole: true },
  });

  const mfa = await getMfaSessionState(supabase);
  const guard = getAdminMfaGuardState(
    row ? { platformRole: row.platformRole } : null,
    mfa,
  );

  let staffStepUp = {
    staffStepUpRequired: false,
    staffStepUpVerified: true,
    staffStepUpAdminMfaRequired: false,
    staffStepUpEventId: null as string | null,
  };

  if (row && pathname) {
    const evalResult = await evaluateStaffStepUp({
      user: { id: row.id, platformRole: row.platformRole },
      pathname,
      method,
      searchParams,
      stepUpCookie: await readStepUpCookieFromStore(),
      supabase,
    });

    staffStepUp = {
      staffStepUpRequired: evalResult.required,
      staffStepUpVerified: evalResult.satisfied,
      staffStepUpAdminMfaRequired: evalResult.adminMfaRequired,
      staffStepUpEventId: evalResult.eventId,
    };
  }

  return NextResponse.json({
    status: row?.status ?? "ACTIVE",
    platformRole: row?.platformRole ?? null,
    isAdmin: guard.isAdmin,
    adminMfaEnrolled: guard.mfaEnrolled,
    adminMfaVerified: guard.mfaVerifiedForSession,
    adminMfaChallengeRequired: guard.needsMfaChallenge,
    adminMfaSetupWarning: guard.showMfaSetupWarning,
    ...staffStepUp,
  });
}
