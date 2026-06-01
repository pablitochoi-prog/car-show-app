import { Prisma, type RegistrationFeeType } from "@prisma/client";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getVerifiedSupabaseUser } from "@/lib/supabase-auth-server";
import {
  getUserEventRoles as getUserEventRolesFromStaff,
  userHasOrganizerStaffRole,
} from "@/lib/event-staff";
import { isUserBanned } from "@/lib/user-access";
import { timeAsync } from "@/lib/request-timing";

/** @deprecated Use getVerifiedSupabaseUser — this already calls getUser(), not getSession(). */
export async function getSession() {
  return getVerifiedSupabaseUser();
}

export { getVerifiedSupabaseUser } from "@/lib/supabase-auth-server";

export async function requireAuth() {
  const user = await getVerifiedSupabaseUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/**
 * Creates the app `User` row on first login if Supabase Auth already has an account
 * (e.g. email confirmed before Prisma create, DB reset, or partial signup).
 */
async function ensurePrismaUser(supabaseUser: SupabaseAuthUser) {
  const existing = await prisma.user.findUnique({
    where: { supabaseId: supabaseUser.id },
  });
  if (existing) return existing;

  const email = (supabaseUser.email ?? "").trim().toLowerCase();
  if (!email) {
    console.error("ensurePrismaUser: missing email for supabaseId", supabaseUser.id);
    return null;
  }

  const meta = supabaseUser.user_metadata as Record<string, unknown> | undefined;
  const firstName =
    typeof meta?.first_name === "string" ? meta.first_name.trim() : null;
  const lastName =
    typeof meta?.last_name === "string" ? meta.last_name.trim() : null;
  const usernameMeta =
    typeof meta?.username === "string"
      ? meta.username.trim().toLowerCase()
      : null;

  const metaName = meta?.name;
  const name =
    firstName && lastName
      ? `${firstName} ${lastName}`.trim()
      : typeof metaName === "string" && metaName.trim()
        ? metaName.trim()
        : email.split("@")[0] || "User";

  try {
    return await prisma.user.create({
      data: {
        supabaseId: supabaseUser.id,
        email,
        name,
        username: usernameMeta || null,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: null,
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const byId = await prisma.user.findUnique({
        where: { supabaseId: supabaseUser.id },
      });
      if (byId) return byId;

      const byEmail = await prisma.user.findUnique({ where: { email } });
      if (byEmail) {
        const m = supabaseUser.user_metadata as Record<string, unknown> | undefined;
        const fn = typeof m?.first_name === "string" ? m.first_name.trim() : null;
        const ln = typeof m?.last_name === "string" ? m.last_name.trim() : null;
        const un =
          typeof m?.username === "string" ? m.username.trim().toLowerCase() : null;
        const metaName = m?.name;
        const name =
          fn && ln
            ? `${fn} ${ln}`.trim()
            : typeof metaName === "string" && metaName.trim()
              ? metaName.trim()
              : byEmail.name;
        return prisma.user.update({
          where: { id: byEmail.id },
          data: {
            supabaseId: supabaseUser.id,
            name,
            ...(un && !byEmail.username ? { username: un } : {}),
            ...(fn ? { firstName: fn } : {}),
            ...(ln ? { lastName: ln } : {}),
          },
        });
      }
      return null;
    }
    console.error("ensurePrismaUser:", e);
    return null;
  }
}

async function getCurrentUserUncached() {
  return timeAsync("auth.getCurrentUser", async () => {
  const supabaseUser = await getVerifiedSupabaseUser();
  if (!supabaseUser) return null;

  const user = await timeAsync("auth.prismaUserLookup", () =>
    prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
    }),
  );

  if (user) {
    /* Sync Prisma email when Supabase auth email changes (e.g. after email change confirmation). */
    const authEmail = (supabaseUser.email ?? "").trim().toLowerCase();
    if (authEmail && authEmail !== user.email) {
      try {
        return await prisma.user.update({
          where: { id: user.id },
          data: { email: authEmail },
        });
      } catch (e) {
        console.error("getCurrentUser: email sync failed", e);
      }
    }
    return user;
  }

  return ensurePrismaUser(supabaseUser);
  });
}

/** Dedupes auth + DB work when layout and page both call this in one request. */
export const getCurrentUser = cache(getCurrentUserUncached);

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (isUserBanned(user)) {
    redirect("/banned");
  }
  return user;
}

/** For mutation API routes — returns 403 JSON if suspended (admins exempt). */
export { writeAccessDeniedResponse, canUserWrite } from "@/lib/user-access";

/** All permission-granting default roles (slug-backed) for this event. */
export async function getUserEventRoles(userId: string, eventId: string) {
  return getUserEventRolesFromStaff(userId, eventId);
}

/** @deprecated Use `getUserEventRoles` (plural) — this only returns the first match. */
export async function getUserEventRole(userId: string, eventId: string) {
  const roles = await getUserEventRolesFromStaff(userId, eventId);
  return roles[0] ?? null;
}

export async function requireEventRole(
  userId: string,
  eventId: string,
  allowedRoles: string[]
) {
  const roles = await getUserEventRoles(userId, eventId);
  if (!roles.some((r) => allowedRoles.includes(r))) {
    throw new Error("Unauthorized: insufficient permissions for this event");
  }
  return roles;
}

export async function getOrgMembership(userId: string, orgId: string) {
  return prisma.organizationMember.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
}

/** Owners can manage org settings and create events (MVP). */
export async function requireOrgOwner(userId: string, orgId: string) {
  const m = await getOrgMembership(userId, orgId);
  if (!m || m.role !== "owner") {
    throw new Error("Unauthorized: organization owner required");
  }
  return m;
}

/** Any membership allows attaching an event to that organization. */
export async function requireOrgMember(userId: string, orgId: string) {
  const m = await getOrgMembership(userId, orgId);
  if (!m) {
    throw new Error("Unauthorized: organization membership required");
  }
  return m;
}

/**
 * @param orgIdHint When the caller already loaded the event, pass `event.orgId`
 *                  to skip a redundant `event.findUnique`.
 * @param platformRole Pass the caller's `user.platformRole` to enable admin bypass.
 */
export async function canManageEvent(
  userId: string,
  eventId: string,
  orgIdHint?: string | null,
  platformRole?: string,
) {
  if (platformRole === "ADMIN") return true;

  if (
    await timeAsync("auth.canManageEvent.staffRole", () =>
      userHasOrganizerStaffRole(userId, eventId),
    )
  ) {
    return true;
  }

  const orgId =
    orgIdHint !== undefined
      ? orgIdHint
      : (
          await timeAsync("auth.canManageEvent.eventLookup", () =>
            prisma.event.findUnique({
              where: { id: eventId },
              select: { orgId: true },
            }),
          )
        )?.orgId;

  if (!orgId) return false;
  const m = await timeAsync("auth.canManageEvent.orgMembership", () =>
    getOrgMembership(userId, orgId),
  );
  return m?.role === "owner";
}

const managedEventSelect = {
  id: true,
  name: true,
  showNumber: true,
  orgId: true,
  status: true,
  registrationFeeType: true,
} as const;

type ManagedEvent = {
  id: string;
  name: string;
  showNumber: number;
  orgId: string | null;
  status: string;
  registrationFeeType: RegistrationFeeType | null;
};

/**
 * Auth-check + load in one pass — avoids the extra `event.findUnique`
 * that pages like tiers/registrations/organization need after `canManageEvent`.
 * @param platformRole Pass the caller's `user.platformRole` to enable admin bypass.
 */
export async function canManageEventAndLoad(
  userId: string,
  eventId: string,
  platformRole?: string,
): Promise<{ allowed: boolean; event: ManagedEvent | null }> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: managedEventSelect,
  });
  if (!event) return { allowed: false, event: null };

  if (platformRole === "ADMIN") return { allowed: true, event };

  const isOrgStaff = await userHasOrganizerStaffRole(userId, eventId);
  if (isOrgStaff) return { allowed: true, event };

  if (!event.orgId) return { allowed: false, event: null };
  const m = await getOrgMembership(userId, event.orgId);
  return { allowed: m?.role === "owner", event };
}
