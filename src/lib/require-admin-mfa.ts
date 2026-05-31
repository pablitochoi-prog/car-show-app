import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMfaSessionState } from "@/lib/mfa-session";
import {
  adminRouteRequiresMfaChallenge,
  getAdminMfaGuardState,
} from "@/lib/admin-mfa-guards";
import { isSiteAdmin } from "@/lib/permissions";

/** Block admin API handlers when MFA is enabled but session is not AAL2. */
export async function requireAdminMfaSession(): Promise<NextResponse | null> {
  const user = await getCurrentUser();
  if (!user || !isSiteAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const mfa = await getMfaSessionState(supabase);
  const guard = getAdminMfaGuardState(user, mfa);

  if (adminRouteRequiresMfaChallenge(guard)) {
    return NextResponse.json(
      {
        error: "Admin MFA verification required.",
        mfaChallengeRequired: true,
      },
      { status: 403 },
    );
  }

  return null;
}
