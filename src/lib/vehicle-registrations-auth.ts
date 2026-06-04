import { canManageEvent } from "@/lib/auth";
import {
  getUserEventRoles,
  userHasHeadJudgeStaffRole,
  userHasOrganizerStaffRole,
} from "@/lib/event-staff";

/**
 * Platform admins, event organizers, head judges, and org/event managers may open
 * Vehicle Registrations and assign judges to vehicles and scorecard categories.
 */
export async function canManageVehicleRegistrations(
  userId: string,
  eventId: string,
  platformRole: string,
): Promise<boolean> {
  if (platformRole === "ADMIN") return true;

  const roles = await getUserEventRoles(userId, eventId);
  if (roles.includes("ORGANIZER") || roles.includes("HEAD_JUDGE")) {
    return true;
  }

  if (await userHasOrganizerStaffRole(userId, eventId)) return true;
  if (await userHasHeadJudgeStaffRole(userId, eventId)) return true;

  return canManageEvent(userId, eventId, undefined, platformRole);
}

/** @deprecated Use {@link canManageVehicleRegistrations}. */
export const canViewVehicleRegistrationsGrid = canManageVehicleRegistrations;
