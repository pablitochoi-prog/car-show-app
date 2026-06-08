import { NextResponse } from "next/server";
import { createSupabaseForResponse } from "@/lib/supabase/route-handler";
import { prisma } from "@/lib/db";
import { resolveSafeRedirectOrigin } from "@/lib/safe-redirect-origin";
import type { EmailOtpType } from "@supabase/supabase-js";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}

/**
 * Handles Supabase token-hash confirmations (email change, signup, recovery).
 * Supabase's default email templates link to /auth/confirm?token_hash=xxx&type=xxx
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(url.searchParams.get("next"));

  const err = url.searchParams.get("error");
  const errDesc = url.searchParams.get("error_description");
  if (err || errDesc) {
    const msg = (errDesc ?? err ?? "auth").slice(0, 500);
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", msg);
    return NextResponse.redirect(login);
  }

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL("/login?error=missing_confirmation_token", url.origin)
    );
  }

  const destination =
    type === "email_change"
      ? "/dashboard/profile?email_updated=1"
      : next;

  const successTarget = `${resolveSafeRedirectOrigin(request)}${destination}`;

  const response = NextResponse.redirect(successTarget);
  const supabase = await createSupabaseForResponse(response);

  const { error: verifyErr } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (verifyErr) {
    console.error("Auth confirm verifyOtp error:", verifyErr.message);
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", verifyErr.message);
    return NextResponse.redirect(login);
  }

  /* Sync Prisma email after email change confirmation. */
  if (type === "email_change") {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser?.email) {
        const normalizedEmail = authUser.email.trim().toLowerCase();
        await prisma.user.updateMany({
          where: { supabaseId: authUser.id },
          data: { email: normalizedEmail },
        });
      }
    } catch (syncErr) {
      console.error("Auth confirm email sync error:", syncErr);
    }
  }

  return response;
}
