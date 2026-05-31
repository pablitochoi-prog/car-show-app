import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { User } from "@prisma/client";
import { canManageEvent } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getMfaSessionState } from "@/lib/mfa-session";
import { canManageEventRegistrations } from "@/lib/organizer-registrations-auth";
import { getUserEventRoles } from "@/lib/event-staff";
import { isSiteAdmin } from "@/lib/permissions";
import { ORGANIZER_OTP_REQUIRED_CODE, STEP_UP_PURPOSE_ORGANIZER } from "@/lib/step-up-config";
import {
  extractEventIdFromPath,
  isSensitiveStaffPath,
} from "@/lib/organizer-step-up-policy";
import {
  isStepUpValidForSession,
  readStepUpCookieFromStore,
} from "@/lib/step-up-session";
import { writeStepUpAuditLog } from "@/lib/step-up-audit";

const STAFF_STEP_UP_ROLES = new Set(["ORGANIZER", "REGISTRAR", "TREASURER"]);

/** Site admins satisfy sensitive access via AAL2 only — never email OTP. */
export async function adminSensitiveAccessSatisfied(
  user: Pick<User, "platformRole">,
): Promise<boolean> {
  if (!isSiteAdmin(user)) return false;
  const supabase = await createClient();
  const mfa = await getMfaSessionState(supabase);
  return mfa.currentLevel === "aal2";
}

/** Whether this staff user manages sensitive data for the event. */
export async function userManagesSensitiveEventData(
  user: Pick<User, "id" | "platformRole">,
  eventId: string | null,
): Promise<boolean> {
  if (isSiteAdmin(user)) return true;
  if (!eventId) return false;

  if (await canManageEventRegistrations(user.id, eventId, user.platformRole)) {
    return true;
  }

  if (await canManageEvent(user.id, eventId, undefined, user.platformRole)) {
    return true;
  }

  const roles = await getUserEventRoles(user.id, eventId);
  return roles.some((r) => STAFF_STEP_UP_ROLES.has(r));
}

export async function isStaffStepUpSatisfied(input: {
  user: Pick<User, "id" | "platformRole">;
  cookiePayload?: Awaited<ReturnType<typeof readStepUpCookieFromStore>>;
}): Promise<boolean> {
  if (await adminSensitiveAccessSatisfied(input.user)) return true;

  const payload =
    input.cookiePayload ?? (await readStepUpCookieFromStore());

  return isStepUpValidForSession(payload, input.user.id, null);
}

export async function evaluateStaffStepUp(input: {
  user: Pick<User, "id" | "platformRole"> | null;
  pathname: string;
  method: string;
  searchParams?: URLSearchParams;
  stepUpCookie?: Awaited<ReturnType<typeof readStepUpCookieFromStore>> | null;
  supabase?: SupabaseClient;
}): Promise<{
  required: boolean;
  satisfied: boolean;
  adminMfaRequired: boolean;
  eventId: string | null;
}> {
  if (!input.user) {
    return {
      required: false,
      satisfied: false,
      adminMfaRequired: false,
      eventId: null,
    };
  }

  if (!isSensitiveStaffPath(input.pathname, input.method, input.searchParams)) {
    return {
      required: false,
      satisfied: true,
      adminMfaRequired: false,
      eventId: null,
    };
  }

  const eventId = extractEventIdFromPath(input.pathname);

  if (isSiteAdmin(input.user)) {
    const supabase = input.supabase ?? (await createClient());
    const mfa = await getMfaSessionState(supabase);
    if (mfa.currentLevel === "aal2") {
      return {
        required: true,
        satisfied: true,
        adminMfaRequired: false,
        eventId,
      };
    }
    if (mfa.hasVerifiedTotp && mfa.needsMfaVerification) {
      return {
        required: true,
        satisfied: false,
        adminMfaRequired: true,
        eventId,
      };
    }
    // Admins without enrolled MFA follow normal admin-route policy (no email OTP).
    return {
      required: false,
      satisfied: true,
      adminMfaRequired: false,
      eventId,
    };
  }

  const manages = await userManagesSensitiveEventData(input.user, eventId);
  if (!manages) {
    return {
      required: false,
      satisfied: true,
      adminMfaRequired: false,
      eventId,
    };
  }

  const payload =
    input.stepUpCookie === undefined
      ? await readStepUpCookieFromStore()
      : input.stepUpCookie;

  const satisfied = isStepUpValidForSession(
    payload,
    input.user.id,
    null,
  );

  return {
    required: true,
    satisfied,
    adminMfaRequired: false,
    eventId,
  };
}

export function organizerOtpRequiredResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "Organizer verification required.",
      code: ORGANIZER_OTP_REQUIRED_CODE,
    },
    { status: 403 },
  );
}

/** Server page guard — redirect to OTP or admin MFA. */
export async function requireStaffStepUpPage(input: {
  user: User;
  pathname: string;
  search?: string;
}): Promise<void> {
  const searchParams = input.search
    ? new URLSearchParams(input.search)
    : undefined;

  const evalResult = await evaluateStaffStepUp({
    user: input.user,
    pathname: input.pathname,
    method: "GET",
    searchParams,
    stepUpCookie: await readStepUpCookieFromStore(),
  });

  if (!evalResult.required || evalResult.satisfied) return;

  if (evalResult.adminMfaRequired) {
    const next = `${input.pathname}${input.search ?? ""}`;
    redirect(`/login/mfa?redirect=${encodeURIComponent(next)}`);
  }

  await writeStepUpAuditLog({
    userId: input.user.id,
    purpose: "ORGANIZER_STEP_UP",
    action: "ACCESS_DENIED",
    eventId: evalResult.eventId,
    route: input.pathname,
  });

  const next = `${input.pathname}${input.search ?? ""}`;
  const dest = new URL("/organizer/verify-otp", "http://local");
  dest.searchParams.set("next", next);
  if (evalResult.eventId) {
    dest.searchParams.set("eventId", evalResult.eventId);
  }
  redirect(`${dest.pathname}?${dest.searchParams.toString()}`);
}

/** API route guard. */
export async function requireStaffStepUpApi(input: {
  user: User;
  request: Request;
  eventId?: string | null;
}): Promise<NextResponse | null> {
  const url = new URL(input.request.url);

  const evalResult = await evaluateStaffStepUp({
    user: input.user,
    pathname: url.pathname,
    method: input.request.method,
    searchParams: url.searchParams,
    stepUpCookie: await readStepUpCookieFromStore(),
  });

  if (!evalResult.required || evalResult.satisfied) return null;

  await writeStepUpAuditLog({
    userId: input.user.id,
    purpose: STEP_UP_PURPOSE_ORGANIZER,
    action: "ACCESS_DENIED",
    eventId: input.eventId ?? evalResult.eventId,
    route: url.pathname,
  });

  return organizerOtpRequiredResponse();
}
