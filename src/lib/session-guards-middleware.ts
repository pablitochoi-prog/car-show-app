import { isBackgroundSessionRequest } from "@/lib/session-activity-policy";

/** Whether middleware should call /api/auth/session-guards (page redirects only). */
export function shouldRunSessionGuardsInMiddleware(pathname: string): boolean {
  if (isBackgroundSessionRequest(pathname)) return false;

  if (!pathname.startsWith("/api/")) {
    return (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/organizer") ||
      pathname.startsWith("/admin")
    );
  }

  // Other API routes enforce auth/step-up in handlers — avoid doubling work here.
  return pathname.startsWith("/api/admin");
}
