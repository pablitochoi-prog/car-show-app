import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMfaSessionState } from "@/lib/mfa-session";
import { isSiteAdmin } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const verifySchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

/** Complete MFA after password login or session refresh (admin only). */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSiteAdmin(user)) {
    return NextResponse.json(
      { error: "MFA verification is only required for site admins." },
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

  const supabase = await createClient();
  const mfa = await getMfaSessionState(supabase);

  if (!mfa.hasVerifiedTotp || !mfa.verifiedFactorId) {
    return NextResponse.json(
      { error: "No authenticator app is enrolled for this account." },
      { status: 400 },
    );
  }

  const factorId = mfa.verifiedFactorId;
  const { data: challengeData, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError || !challengeData) {
    return NextResponse.json(
      { error: "Could not start MFA verification. Try again." },
      { status: 400 },
    );
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code: parsed.data.code,
  });

  if (verifyError) {
    return NextResponse.json(
      { error: "Invalid or expired code. Try again." },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true });
}
