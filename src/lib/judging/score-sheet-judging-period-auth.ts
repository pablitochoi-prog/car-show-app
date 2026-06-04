import { canManageEvent } from "@/lib/auth";
import {
  getUserEventRoles,
  userHasHeadJudgeStaffRole,
  userHasOrganizerStaffRole,
} from "@/lib/event-staff";

/**
 * Site admin, event organizer, head judge, organizer staff, or org owner may
 * view results and end / finalize the score sheet judging period.
 */
export async function canManageScoreSheetJudging(
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
