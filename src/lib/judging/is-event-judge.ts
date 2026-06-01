import { getUserEventRoles } from "@/lib/event-staff";

/** True when the user has the JUDGE staff role on the event. */
export async function isEventJudge(
  userId: string,
  eventId: string,
): Promise<boolean> {
  const roles = await getUserEventRoles(userId, eventId);
  return roles.includes("JUDGE");
}
