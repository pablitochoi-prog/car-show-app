import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  checkSessionIdle,
  idleExcludedPath,
  setActivityCookie,
  shouldTouchSessionActivity,
} from "@/lib/session-activity-server";
import { idleLogoutResponse } from "@/lib/session-idle-middleware";

const MFA_ALLOWED_PREFIXES = [
  "/login",
  "/login/mfa",
  "/dashboard/security",
  "/api/auth/",
  "/api/me/mfa/",
];

function pathAllowedDuringMfaChallenge(pathname: string): boolean {
  return MFA_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add them to .env.local and restart `npm run dev`."
    );
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    url,
    anon,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user: User | null = null;
  try {
    const res = await supabase.auth.getUser();
    user = res.data.user;
  } catch (e) {
    console.error("[middleware] supabase.auth.getUser()", e);
    throw e;
  }

  const pathname = request.nextUrl.pathname;

  if (user && !idleExcludedPath(pathname)) {
    const idle = checkSessionIdle(request);
    if (idle.expired) {
      return idleLogoutResponse(request, supabase, supabaseResponse);
    }
    if (shouldTouchSessionActivity(request)) {
      setActivityCookie(supabaseResponse, Date.now());
    }
  }

  // Redirect unauthenticated users away from protected routes
  const protectedPaths = ["/dashboard", "/organizer", "/admin"];
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const skipSessionGuardCheck =
    pathname === "/banned" ||
    pathname.startsWith("/api/auth/") ||
    (!user && !isProtected);

  if (user && !skipSessionGuardCheck) {
    try {
      const guardsUrl = new URL("/api/auth/session-guards", request.nextUrl.origin);
      const guardsRes = await fetch(guardsUrl, {
        headers: { cookie: request.headers.get("cookie") ?? "" },
      });
      if (guardsRes.ok) {
        const data = (await guardsRes.json()) as {
          status?: string | null;
          adminMfaChallengeRequired?: boolean;
        };

        if (data.status === "BANNED" && pathname !== "/banned") {
          const bannedUrl = request.nextUrl.clone();
          bannedUrl.pathname = "/banned";
          bannedUrl.search = "";
          return NextResponse.redirect(bannedUrl);
        }

        const isAdminRoute =
          pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

        if (
          data.adminMfaChallengeRequired &&
          isAdminRoute &&
          !pathAllowedDuringMfaChallenge(pathname)
        ) {
          if (pathname.startsWith("/api/")) {
            return NextResponse.json(
              {
                error: "Admin MFA verification required.",
                mfaChallengeRequired: true,
              },
              { status: 403 },
            );
          }

          const mfaUrl = request.nextUrl.clone();
          mfaUrl.pathname = "/login/mfa";
          mfaUrl.searchParams.set("redirect", pathname);
          return NextResponse.redirect(mfaUrl);
        }
      }
    } catch (e) {
      console.error("[middleware] session-guards check failed", e);
    }
  }

  return supabaseResponse;
}
