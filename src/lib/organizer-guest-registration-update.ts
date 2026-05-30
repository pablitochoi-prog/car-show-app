import type { GuestVehicleRecord } from "@/lib/event-sms-vehicle-id";

type GuestVehicleOrganizerPatch = {
  publicVehicleId: string;
  nickname?: string;
  eventCategoryId?: string | null;
  notes?: string;
};

export function parseGuestVehicleRecords(raw: unknown): GuestVehicleRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is GuestVehicleRecord =>
      item != null && typeof item === "object",
  );
}

export function mergeGuestVehicleOrganizerUpdates(
  existing: GuestVehicleRecord[],
  updates: GuestVehicleOrganizerPatch[],
): GuestVehicleRecord[] {
  if (updates.length === 0) return existing;

  const byId = new Map(
    updates.map((u) => [u.publicVehicleId.trim(), u] as const),
  );

  return existing.map((vehicle) => {
    const pid = vehicle.publicVehicleId?.trim();
    if (!pid) return vehicle;

    const patch = byId.get(pid);
    if (!patch) return vehicle;

    return {
      ...vehicle,
      ...(patch.nickname !== undefined
        ? { nickname: patch.nickname?.trim() || null }
        : {}),
      ...(patch.eventCategoryId !== undefined
        ? { eventCategoryId: patch.eventCategoryId }
        : {}),
      ...(patch.notes !== undefined
        ? { notes: patch.notes.trim() || null }
        : {}),
    };
  });
}
