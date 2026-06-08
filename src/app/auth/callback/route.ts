import { NextResponse } from "next/server";
import { createSupabaseForResponse } from "@/lib/supabase/route-handler";
import { prisma } from "@/lib/db";
import { resolveSafeRedirectOrigin } from "@/lib/safe-redirect-origin";

function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeNextPath(url.searchParams.get("next"));

  const err = url.searchParams.get("error");
  const errDesc = url.searchParams.get("error_description");
  if (err || errDesc) {
    const msg = (errDesc ?? err ?? "auth").slice(0, 500);
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", msg);
    return NextResponse.redirect(login);
  }

  if (!code && !tokenHash) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const successTarget = `${resolveSafeRedirectOrigin(request)}${next}`;

  const response = NextResponse.redirect(successTarget);
  const supabase = await createSupabaseForResponse(response);

  if (tokenHash) {
    /* Token-hash flow: email change confirmations, magic links, etc. */
    const otpType =
      type === "email_change"
        ? "email_change"
        : type === "recovery"
          ? "recovery"
          : "email";
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as "email_change" | "recovery" | "email",
    });
    if (verifyErr) {
      console.error("Auth callback verifyOtp error:", verifyErr.message);
      const login = new URL("/login", url.origin);
      login.searchParams.set("error", verifyErr.message);
      return NextResponse.redirect(login);
    }
  } else if (code) {
    /* PKCE code-exchange flow: standard login / signup callbacks. */
    const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeErr) {
      console.error("Auth callback exchange error:", exchangeErr.message);
      const login = new URL("/login", url.origin);
      login.searchParams.set("error", exchangeErr.message);
      return NextResponse.redirect(login);
    }
  }

  /* Sync Prisma email after any auth event (catches email changes). */
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
    console.error("Auth callback email sync error:", syncErr);
  }

  return response;
}
