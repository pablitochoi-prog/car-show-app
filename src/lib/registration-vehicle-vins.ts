import type { Prisma } from "@prisma/client";

function normalizeVin(raw: string | undefined): string | null | undefined {
  if (raw === undefined) return undefined;
  const t = raw.trim().toUpperCase().replace(/\s+/g, "");
  return t === "" ? null : t.slice(0, 17);
}

/** Persist optional VINs from the registration form onto garage vehicles. */
export async function applyVehicleVinsFromRegistration(
  tx: Prisma.TransactionClient,
  userId: string,
  vehicleIds: string[],
  vehicleVins: Record<string, string | undefined> | undefined,
): Promise<void> {
  if (!vehicleVins || vehicleIds.length === 0) return;

  for (const vehicleId of vehicleIds) {
    if (!(vehicleId in vehicleVins)) continue;
    const vin = normalizeVin(vehicleVins[vehicleId]);
    if (vin === undefined) continue;
    await tx.vehicle.updateMany({
      where: { id: vehicleId, userId },
      data: { vin },
    });
  }
}
