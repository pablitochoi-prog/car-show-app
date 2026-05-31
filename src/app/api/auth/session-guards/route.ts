import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMfaSessionState } from "@/lib/mfa-session";
import { getAdminMfaGuardState } from "@/lib/admin-mfa-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Session guard flags for middleware (ban + admin MFA). */
export async function GET() {
  const supabaseUser = await getSession();
  if (!supabaseUser) {
    return NextResponse.json({
      status: null,
      platformRole: null,
      isAdmin: false,
      adminMfaEnrolled: false,
      adminMfaVerified: false,
      adminMfaChallengeRequired: false,
      adminMfaSetupWarning: false,
    });
  }

  const row = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
    select: { status: true, platformRole: true },
  });

  const supabase = await createClient();
  const mfa = await getMfaSessionState(supabase);
  const guard = getAdminMfaGuardState(
    row ? { platformRole: row.platformRole } : null,
    mfa,
  );

  return NextResponse.json({
    status: row?.status ?? "ACTIVE",
    platformRole: row?.platformRole ?? null,
    isAdmin: guard.isAdmin,
    adminMfaEnrolled: guard.mfaEnrolled,
    adminMfaVerified: guard.mfaVerifiedForSession,
    adminMfaChallengeRequired: guard.needsMfaChallenge,
    adminMfaSetupWarning: guard.showMfaSetupWarning,
  });
}
