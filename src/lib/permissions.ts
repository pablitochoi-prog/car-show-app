import type { PlatformRole, EventRole } from "@/types";

/** Minimal user shape needed for permission checks (avoids importing full Prisma type). */
export type PermUser = { platformRole: PlatformRole };

// ---------------------------------------------------------------------------
// Site-level role checks
// ---------------------------------------------------------------------------

export function isSiteAdmin(user: PermUser): boolean {
  return user.platformRole === "ADMIN";
}

export function isOrganizerOrAbove(user: PermUser): boolean {
  return user.platformRole === "ORGANIZER" || user.platformRole === "ADMIN";
}

/** Can this user create events and organizations? */
export function canCreateEvent(user: PermUser): boolean {
  return isOrganizerOrAbove(user);
}

/** Can this user create / manage organizations? */
export function canCreateOrganization(user: PermUser): boolean {
  return isOrganizerOrAbove(user);
}

// ---------------------------------------------------------------------------
// Event-scoped role checks (operate on a roles array, no DB)
// ---------------------------------------------------------------------------

export function hasEventRole(roles: EventRole[], role: EventRole): boolean {
  return roles.includes(role);
}

export function isEventOrganizer(roles: EventRole[]): boolean {
  return hasEventRole(roles, "ORGANIZER");
}

/** Can assign / remove staff on this event? Requires ORGANIZER staff role or site admin. */
export function canAssignEventStaff(
  user: PermUser,
  eventRoles: EventRole[],
): boolean {
  return isSiteAdmin(user) || isEventOrganizer(eventRoles);
}

/** Can edit core event data (name, dates, venue, status, tiers, etc.)? */
export function canEditEvent(
  user: PermUser,
  eventRoles: EventRole[],
): boolean {
  return isSiteAdmin(user) || isEventOrganizer(eventRoles);
}

export function canJudge(roles: EventRole[]): boolean {
  return hasEventRole(roles, "JUDGE");
}

export function canManageFinances(roles: EventRole[]): boolean {
  return hasEventRole(roles, "TREASURER");
}

export function canManageAttendees(roles: EventRole[]): boolean {
  return hasEventRole(roles, "REGISTRAR");
}

/** Can edit promotional content (flyer, description, social links) but NOT core event data. */
export function canEditPromo(roles: EventRole[]): boolean {
  return hasEventRole(roles, "MARKETING");
}
