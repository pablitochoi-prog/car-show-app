import type { StepUpPurpose } from "@/lib/step-up-config";
import { STEP_UP_PURPOSE_ORGANIZER } from "@/lib/step-up-config";

const UUID_SEGMENT = "[^/]+";

/** Extract event id from organizer UI or event API paths. */
export function extractEventIdFromPath(pathname: string): string | null {
  const organizer = pathname.match(
    new RegExp(`^/organizer/events/(${UUID_SEGMENT})`),
  );
  if (organizer?.[1]) return organizer[1];

  const api = pathname.match(new RegExp(`^/api/events/(${UUID_SEGMENT})`));
  if (api?.[1]) return api[1];

  return null;
}

/** Organizer pages requiring staff email OTP (or admin AAL2). */
export function isSensitiveOrganizerPagePath(pathname: string): boolean {
  if (pathname === "/organizer/verify-otp") return false;

  const match = pathname.match(/^\/organizer\/events\/[^/]+(\/.*)?$/);
  if (!match) return false;

  const rest = match[1] ?? "";
  if (!rest || rest === "/") return false;

  return (
    rest.startsWith("/edit") ||
    rest.startsWith("/registrations") ||
    rest.startsWith("/vehicle-registrations") ||
    rest.startsWith("/reports") ||
    rest.startsWith("/messages")
  );
}

const PUBLIC_EVENT_API_SUFFIXES = [
  "/register",
  "/register-guest",
  "/available-categories",
  "/calendar",
] as const;

/** Event APIs requiring staff step-up when returning/mutating sensitive management data. */
export function isSensitiveEventApiPath(pathname: string, method: string): boolean {
  if (!pathname.startsWith("/api/events/")) return false;

  const eventRest = pathname.replace(/^\/api\/events\/[^/]+/, "") || "/";

  for (const pub of PUBLIC_EVENT_API_SUFFIXES) {
    if (eventRest === pub || eventRest.startsWith(`${pub}/`)) return false;
  }

  if (eventRest === "" || eventRest === "/") {
    return method !== "GET";
  }

  if (eventRest.startsWith("/registrations")) return true;
  if (eventRest.startsWith("/payment-settings")) return true;
  if (eventRest.startsWith("/sponsor")) return true;
  if (eventRest.startsWith("/charity")) return true;
  if (eventRest.startsWith("/categories")) return true;
  if (eventRest.startsWith("/tiers")) return true;
  if (eventRest.startsWith("/awards")) return true;
  if (eventRest.startsWith("/sms-voting")) return true;
  if (eventRest.startsWith("/clone")) return true;
  if (eventRest.startsWith("/upload")) return true;
  if (eventRest.startsWith("/staff")) return true;
  if (eventRest.startsWith("/transfer-organizer")) return true;
  if (eventRest.startsWith("/platform-setup-fee")) return true;

  return false;
}

/** Messages API when loading/sending organizer event communications. */
export function isSensitiveMessagesApiPath(
  pathname: string,
  searchParams: URLSearchParams,
): boolean {
  if (pathname === "/api/messages/unread-count") return false;

  if (pathname === "/api/messages" || pathname.startsWith("/api/messages/")) {
    const role = searchParams.get("role");
    const eventId = searchParams.get("eventId");
    if (role === "organizer" && eventId) return true;
    if (pathname.startsWith("/api/messages/")) {
      return true;
    }
  }
  return false;
}

export function isStepUpExemptPath(pathname: string): boolean {
  return (
    pathname === "/organizer/verify-otp" ||
    pathname.startsWith("/api/organizer/otp/") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/login")
  );
}

export function isSensitiveStaffPath(
  pathname: string,
  method: string,
  searchParams?: URLSearchParams,
): boolean {
  if (isStepUpExemptPath(pathname)) return false;
  if (isSensitiveOrganizerPagePath(pathname)) return true;
  if (isSensitiveEventApiPath(pathname, method)) return true;
  if (searchParams && isSensitiveMessagesApiPath(pathname, searchParams)) return true;
  return false;
}

export function stepUpPurposeForPath(_pathname: string): StepUpPurpose {
  return STEP_UP_PURPOSE_ORGANIZER;
}
