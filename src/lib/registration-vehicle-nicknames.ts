import type { Prisma } from "@prisma/client";

/** Persist per-vehicle nicknames from the registration form onto garage vehicles. */
export async function applyVehicleNicknamesFromRegistration(
  tx: Prisma.TransactionClient,
  userId: string,
  vehicleIds: string[],
  vehicleNicknames: Record<string, string | undefined> | undefined,
): Promise<void> {
  if (!vehicleNicknames || vehicleIds.length === 0) return;

  for (const vehicleId of vehicleIds) {
    if (!(vehicleId in vehicleNicknames)) continue;
    const raw = vehicleNicknames[vehicleId];
    const nickname =
      raw === undefined ? undefined : raw?.trim() ? raw.trim() : null;
    await tx.vehicle.updateMany({
      where: { id: vehicleId, userId },
      data: { nickname },
    });
  }
}
