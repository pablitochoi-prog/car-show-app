import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMfaSessionState } from "@/lib/mfa-session";
import { getAdminMfaGuardState } from "@/lib/admin-mfa-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const mfa = await getMfaSessionState(supabase);
  const guard = getAdminMfaGuardState(user, mfa);

  return NextResponse.json({
    ...guard,
    currentLevel: mfa.currentLevel,
    nextLevel: mfa.nextLevel,
  });
}
