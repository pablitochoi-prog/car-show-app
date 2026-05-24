import type { EventStatus } from "@prisma/client";
import { canManageEvent, getCurrentUser } from "@/lib/auth";
import { getUserEventRoles, userHasOrganizerStaffRole } from "@/lib/event-staff";
import type {
  VehicleEntryRecord,
  VehicleEntryVisitorRole,
} from "@/lib/vehicle-entry-types";

const PUBLIC_VOTING_STATUSES: EventStatus[] = [
  "PUBLISHED",
  "ACTIVE",
  "VOTING",
];

export function isPublicVotingOpenForEvent(status: EventStatus): boolean {
  return PUBLIC_VOTING_STATUSES.includes(status);
}

export function isJudgingOpenForEvent(status: EventStatus): boolean {
  return ["ACTIVE", "VOTING"].includes(status);
}

export async function resolveVehicleEntryVisitorRole(
  userId: string | null,
  eventId: string,
  platformRole?: string,
): Promise<VehicleEntryVisitorRole> {
  if (!userId) return "anonymous";

  if (platformRole === "ADMIN") return "organizer";
  if (await userHasOrganizerStaffRole(userId, eventId)) return "organizer";
  if (await canManageEvent(userId, eventId, undefined, platformRole)) {
    return "organizer";
  }

  const roles = await getUserEventRoles(userId, eventId);
  if (roles.includes("JUDGE")) return "judge";

  return "user";
}

export async function getVehicleEntryVisitorContext() {
  const user = await getCurrentUser();
  return { user };
}

export async function resolveVisitorRoleForEntry(
  entry: VehicleEntryRecord,
): Promise<VehicleEntryVisitorRole> {
  const { user } = await getVehicleEntryVisitorContext();
  if (!user) return "anonymous";
  return resolveVehicleEntryVisitorRole(
    user.id,
    entry.eventId,
    user.platformRole,
  );
}
