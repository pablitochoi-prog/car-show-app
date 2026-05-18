import { canManageEvent } from "@/lib/auth";
import { getUserEventRoles } from "@/lib/event-staff";

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
