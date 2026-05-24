import { canManageEvent } from "@/lib/auth";
import { getUserEventRoles } from "@/lib/event-staff";
import type { EventRole } from "@/types";

const STAFF_PHOTO_VIEW_ROLES = new Set<EventRole>([
  "ORGANIZER",
  "REGISTRAR",
  "TREASURER",
  "JUDGE",
  "MARKETING",
  "VOLUNTEER",
]);

/** Organizer, treasurer, registrar staff, or platform managers may manage event registrations. */
export async function canManageEventRegistrations(
  userId: string,
  eventId: string,
  platformRole: string,
): Promise<boolean> {
  const roles = await getUserEventRoles(userId, eventId);
  if (
    roles.includes("REGISTRAR") ||
    roles.includes("ORGANIZER") ||
    roles.includes("TREASURER")
  ) {
    return true;
  }
  return canManageEvent(userId, eventId, undefined, platformRole);
}

/** Event staff may view semi-private registration photos (not public). */
export async function canViewEventRegistrationStaffPhotos(
  userId: string,
  eventId: string,
  platformRole: string,
): Promise<boolean> {
  if (platformRole === "ADMIN") return true;
  if (await canManageEventRegistrations(userId, eventId, platformRole)) {
    return true;
  }
  const roles = await getUserEventRoles(userId, eventId);
  return roles.some((role) => STAFF_PHOTO_VIEW_ROLES.has(role));
}
