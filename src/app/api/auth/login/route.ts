import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSupabaseForResponse } from "@/lib/supabase/route-handler";
import { loginSchema } from "@/lib/validation/auth";
import { getMfaSessionState } from "@/lib/mfa-session";
import { isSiteAdmin } from "@/lib/permissions";
import {
  setActivityCookie,
  touchUserLastActivityDb,
} from "@/lib/session-activity-server";

function applyLoginActivity(
  response: NextResponse,
  prismaUserId: string | undefined,
) {
  const nowMs = Date.now();
  setActivityCookie(response, nowMs);
  if (prismaUserId) {
    void touchUserLastActivityDb(prismaUserId, nowMs);
  }
}

function copyAuthCookies(from: NextResponse, to: NextResponse) {
  for (const c of from.cookies.getAll()) {
    to.cookies.set(c.name, c.value, c);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;

    const response = NextResponse.json({ ok: true });
    const supabase = await createSupabaseForResponse(response);
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const supabaseId = signInData.user?.id;
    const prismaUser = supabaseId
      ? await prisma.user.findUnique({
          where: { supabaseId },
          select: { id: true, platformRole: true },
        })
      : null;

    if (prismaUser && isSiteAdmin(prismaUser)) {
      const mfa = await getMfaSessionState(supabase);

      if (mfa.hasVerifiedTotp && mfa.needsMfaVerification) {
        const mfaResponse = NextResponse.json({
          ok: true,
          mfaRequired: true,
          adminMfaSetupWarning: false,
        });
        copyAuthCookies(response, mfaResponse);
        applyLoginActivity(mfaResponse, prismaUser.id);
        return mfaResponse;
      }

      const warnResponse = NextResponse.json({
        ok: true,
        mfaRequired: false,
        adminMfaSetupWarning: !mfa.hasVerifiedTotp,
      });
      copyAuthCookies(response, warnResponse);
      applyLoginActivity(warnResponse, prismaUser.id);
      return warnResponse;
    }

    const successResponse = NextResponse.json({
      ok: true,
      mfaRequired: false,
      adminMfaSetupWarning: false,
    });
    copyAuthCookies(response, successResponse);
    applyLoginActivity(successResponse, prismaUser?.id);
    return successResponse;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
