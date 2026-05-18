import { prisma } from "@/lib/db";

/** Map of eventId -> registrationId for the user's active (non-cancelled) registrations. */
export async function getRegisteredEventMapForUser(
  userId: string,
): Promise<Map<string, string>> {
  const rows = await prisma.registration.findMany({
    where: {
      userId,
      status: { not: "CANCELLED" },
    },
    select: { id: true, eventId: true },
  });
  return new Map(rows.map((r) => [r.eventId, r.id]));
}

/** Event IDs where the user has an active (non-cancelled) exhibitor registration. */
export async function getRegisteredEventIdsForUser(
  userId: string,
): Promise<Set<string>> {
  const map = await getRegisteredEventMapForUser(userId);
  return new Set(map.keys());
}

export function isEventRegistered(
  eventId: string,
  registeredEventIds: Set<string> | Map<string, string>,
): boolean {
  return registeredEventIds.has(eventId);
}
