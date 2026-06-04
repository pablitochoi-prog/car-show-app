import { prisma } from "@/lib/db";
import {
  parseEventDateInput,
  vehicleManualAwardWriteSchema,
  type VehicleManualAwardWriteInput,
} from "@/lib/validation/vehicle-manual-award";
import type { MyVehicleAwardEntry } from "@/lib/my-vehicle-awards";

function formatEventDate(startDate: Date): string {
  return startDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function manualAwardToEntry(row: {
  id: string;
  awardName: string;
  eventName: string;
  eventDate: Date;
  organizationName: string | null;
  createdAt: Date;
}): MyVehicleAwardEntry {
  return {
    id: `manual:${row.id}`,
    source: "manual",
    awardName: row.awardName,
    eventId: null,
    eventName: row.eventName,
    eventDateIso: row.eventDate.toISOString(),
    eventDateLabel: formatEventDate(row.eventDate),
    organizationName: row.organizationName,
    publishedAtIso: row.createdAt.toISOString(),
  };
}

export async function assertUserOwnsVehicle(
  userId: string,
  vehicleId: string,
): Promise<boolean> {
  const row = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId, archivedAt: null },
    select: { id: true },
  });
  return Boolean(row);
}

export async function createVehicleManualAward(
  userId: string,
  vehicleId: string,
  input: VehicleManualAwardWriteInput,
) {
  const parsed = vehicleManualAwardWriteSchema.parse(input);
  if (!(await assertUserOwnsVehicle(userId, vehicleId))) {
    return null;
  }

  const row = await prisma.vehicleManualAward.create({
    data: {
      userId,
      vehicleId,
      awardName: parsed.awardName,
      eventName: parsed.eventName,
      eventDate: parseEventDateInput(parsed.eventDate),
      organizationName: parsed.organizationName?.trim() || null,
    },
  });

  return manualAwardToEntry(row);
}

export async function updateVehicleManualAward(
  userId: string,
  vehicleId: string,
  awardId: string,
  input: VehicleManualAwardWriteInput,
) {
  const parsed = vehicleManualAwardWriteSchema.parse(input);
  const existing = await prisma.vehicleManualAward.findFirst({
    where: { id: awardId, userId, vehicleId },
  });
  if (!existing) return null;

  const row = await prisma.vehicleManualAward.update({
    where: { id: awardId },
    data: {
      awardName: parsed.awardName,
      eventName: parsed.eventName,
      eventDate: parseEventDateInput(parsed.eventDate),
      organizationName: parsed.organizationName?.trim() || null,
    },
  });

  return manualAwardToEntry(row);
}

export async function deleteVehicleManualAward(
  userId: string,
  vehicleId: string,
  awardId: string,
): Promise<boolean> {
  const existing = await prisma.vehicleManualAward.findFirst({
    where: { id: awardId, userId, vehicleId },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.vehicleManualAward.delete({ where: { id: awardId } });
  return true;
}

export async function loadManualAwardsByVehicleIds(
  userId: string,
  vehicleIds: string[],
): Promise<Map<string, MyVehicleAwardEntry[]>> {
  if (vehicleIds.length === 0) return new Map();

  const rows = await prisma.vehicleManualAward.findMany({
    where: { userId, vehicleId: { in: vehicleIds } },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
  });

  const map = new Map<string, MyVehicleAwardEntry[]>();
  for (const row of rows) {
    const list = map.get(row.vehicleId) ?? [];
    list.push(manualAwardToEntry(row));
    map.set(row.vehicleId, list);
  }
  return map;
}

export async function countManualAwardsForUser(userId: string): Promise<number> {
  return prisma.vehicleManualAward.count({
    where: { userId, vehicle: { archivedAt: null } },
  });
}
