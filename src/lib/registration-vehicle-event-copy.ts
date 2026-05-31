import type { Prisma } from "@prisma/client";

/** Trim submitted copy; empty string becomes null. */
export function normalizeRegistrationVehicleCopy(
  value: string | undefined,
): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Prefer event-specific copy; fall back to garage profile when event copy is empty. */
export function resolveRegistrationVehicleNickname(
  eventNickname: string | null | undefined,
  garageNickname: string | null | undefined,
): string | null {
  const event = eventNickname?.trim();
  if (event) return event;
  const garage = garageNickname?.trim();
  return garage || null;
}

/** Prefer event-specific story; fall back to garage notes when event story is empty. */
export function resolveRegistrationVehicleStory(
  eventStory: string | null | undefined,
  garageNotes: string | null | undefined,
): string | null {
  const event = eventStory?.trim();
  if (event) return event;
  const garage = garageNotes?.trim();
  return garage || null;
}

/**
 * Persist event-specific nickname/story onto RegistrationVehicle rows.
 * Does not modify garage Vehicle records.
 */
export async function applyRegistrationVehicleEventCopyFromRegistration(
  tx: Prisma.TransactionClient,
  registrationId: string,
  vehicleIds: string[],
  vehicleNicknames: Record<string, string | undefined> | undefined,
  vehicleStories: Record<string, string | undefined> | undefined,
): Promise<void> {
  if (vehicleIds.length === 0) return;

  for (const vehicleId of vehicleIds) {
    const hasNickname = vehicleNicknames && vehicleId in vehicleNicknames;
    const hasStory = vehicleStories && vehicleId in vehicleStories;
    if (!hasNickname && !hasStory) continue;

    const data: {
      vehicleNickname?: string | null;
      vehicleStory?: string | null;
    } = {};

    if (hasNickname) {
      data.vehicleNickname = normalizeRegistrationVehicleCopy(
        vehicleNicknames![vehicleId],
      );
    }
    if (hasStory) {
      data.vehicleStory = normalizeRegistrationVehicleCopy(
        vehicleStories![vehicleId],
      );
    }

    await tx.registrationVehicle.updateMany({
      where: { registrationId, vehicleId },
      data,
    });
  }
}
