import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { logObservabilityError } from "@/lib/structured-logging";
import {
  checkSessionIdle,
  idleExcludedPath,
  setActivityCookie,
  shouldTouchSessionActivity,
} from "@/lib/session-activity-server";
import { idleLogoutResponse } from "@/lib/session-idle-middleware";
import { ORGANIZER_OTP_REQUIRED_CODE } from "@/lib/step-up-config";
import { isStepUpExemptPath } from "@/lib/organizer-step-up-policy";
import { shouldRunSessionGuardsInMiddleware } from "@/lib/session-guards-middleware";

const MFA_ALLOWED_PREFIXES = [
  "/login",
  "/login/mfa",
  "/dashboard/security",
  "/api/auth/",
  "/api/me/mfa/",
];

const STAFF_STEP_UP_ALLOWED_PREFIXES = [
  "/organizer/verify-otp",
  "/api/organizer/otp/",
  ...MFA_ALLOWED_PREFIXES,
];

function pathAllowedDuringMfaChallenge(pathname: string): boolean {
  return MFA_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

function pathAllowedDuringStaffStepUp(pathname: string): boolean {
  return STAFF_STEP_UP_ALLOWED_PREFIXES.some(
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
    logObservabilityError({ source: "middleware.getUser", error: e });
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

  if (user && !skipSessionGuardCheck && shouldRunSessionGuardsInMiddleware(pathname)) {
    try {
      const guardsUrl = new URL("/api/auth/session-guards", request.nextUrl.origin);
      guardsUrl.searchParams.set("pathname", pathname);
      guardsUrl.searchParams.set("method", request.method);
      if (request.nextUrl.search) {
        guardsUrl.searchParams.set("search", request.nextUrl.search.slice(1));
      }
      const guardsRes = await fetch(guardsUrl, {
        headers: { cookie: request.headers.get("cookie") ?? "" },
      });
      if (guardsRes.ok) {
        const data = (await guardsRes.json()) as {
          status?: string | null;
          adminMfaChallengeRequired?: boolean;
          staffStepUpRequired?: boolean;
          staffStepUpVerified?: boolean;
          staffStepUpAdminMfaRequired?: boolean;
          staffStepUpEventId?: string | null;
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

        const needsStaffStepUp =
          data.staffStepUpRequired &&
          !data.staffStepUpVerified &&
          !isStepUpExemptPath(pathname) &&
          !pathAllowedDuringStaffStepUp(pathname);

        if (needsStaffStepUp) {
          if (data.staffStepUpAdminMfaRequired) {
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
            mfaUrl.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
            return NextResponse.redirect(mfaUrl);
          }

          if (pathname.startsWith("/api/")) {
            return NextResponse.json(
              {
                error: "Organizer verification required.",
                code: ORGANIZER_OTP_REQUIRED_CODE,
              },
              { status: 403 },
            );
          }

          const otpUrl = request.nextUrl.clone();
          otpUrl.pathname = "/organizer/verify-otp";
          otpUrl.searchParams.set(
            "next",
            `${pathname}${request.nextUrl.search}`,
          );
          if (data.staffStepUpEventId) {
            otpUrl.searchParams.set("eventId", data.staffStepUpEventId);
          }
          otpUrl.search = otpUrl.searchParams.toString();
          return NextResponse.redirect(otpUrl);
        }
      }
    } catch (e) {
      logObservabilityError({ source: "middleware.sessionGuards", error: e });
    }
  }

  return supabaseResponse;
}
