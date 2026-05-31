import type { NextRequest } from "next/server";

export function idleExcludedPath(pathname: string): boolean {
  if (
    pathname === "/login" ||
    pathname === "/login/mfa" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/signup") ||
    pathname.startsWith("/api/auth/logout") ||
    pathname.startsWith("/api/auth/mfa/") ||
    pathname.startsWith("/api/me/mfa/") ||
    pathname.startsWith("/api/stripe/webhook")
  ) {
    return true;
  }
  return false;
}

/** Background polls / internal calls — must not reset the idle timer. */
const IDLE_BACKGROUND_PATHS = [
  "/api/messages/unread-count",
  "/api/auth/session-guards",
] as const;

export function isBackgroundSessionRequest(pathname: string): boolean {
  return IDLE_BACKGROUND_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isPrefetchRequest(request: NextRequest): boolean {
  return (
    request.headers.get("Next-Router-Prefetch") === "1" ||
    request.headers.get("Purpose") === "prefetch"
  );
}

/** Whether this request reflects intentional user activity (sliding expiration). */
export function shouldTouchSessionActivity(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  if (idleExcludedPath(pathname) || isBackgroundSessionRequest(pathname)) {
    return false;
  }
  if (isPrefetchRequest(request)) {
    return false;
  }

  if (pathname === "/api/auth/session-activity" && method === "POST") {
    return true;
  }
  if (method !== "GET" && method !== "HEAD") {
    return true;
  }
  if (method === "GET" && !pathname.startsWith("/api/")) {
    return true;
  }

  return false;
}
