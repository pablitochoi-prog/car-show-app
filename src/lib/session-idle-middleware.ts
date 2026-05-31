import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { clearActivityCookies } from "@/lib/session-activity-server";
import { clearStepUpCookie } from "@/lib/step-up-cookie-edge";

/** Sign out and redirect or return 401 when idle timeout is exceeded. */
export async function idleLogoutResponse(
  request: NextRequest,
  supabase: SupabaseClient,
  supabaseResponse: NextResponse,
): Promise<NextResponse> {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error("[middleware] idle signOut", e);
  }

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/")) {
    const res = NextResponse.json(
      {
        error: "Session expired due to inactivity.",
        sessionExpired: true,
        reason: "idle",
      },
      { status: 401 },
    );
    copyAuthCookies(supabaseResponse, res);
    clearActivityCookies(res);
    clearStepUpCookie(res);
    clearSupabaseCookies(request, res);
    return res;
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("reason", "idle");
  loginUrl.search = loginUrl.searchParams.toString();

  const res = NextResponse.redirect(loginUrl);
  copyAuthCookies(supabaseResponse, res);
  clearActivityCookies(res);
  clearStepUpCookie(res);
  clearSupabaseCookies(request, res);
  return res;
}

function copyAuthCookies(from: NextResponse, to: NextResponse) {
  for (const c of from.cookies.getAll()) {
    to.cookies.set(c.name, c.value, c);
  }
}

function clearSupabaseCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
    }
  }
}
