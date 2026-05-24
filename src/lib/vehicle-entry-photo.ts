import { Prisma } from "@prisma/client";
import type { GuestVehicleRecord } from "@/lib/event-sms-vehicle-id";
import { prisma } from "@/lib/db";
import { normalizeVehicleEntryCode } from "@/lib/vehicle-entry-code";

/** Resolve private R2 object key for an event-published vehicle photo, if any. */
export async function findVehicleEntryPhotoObjectKey(
  rawCode: string,
): Promise<string | null> {
  const code = normalizeVehicleEntryCode(rawCode);
  if (!code) return null;

  const rv = await prisma.registrationVehicle.findUnique({
    where: { publicVehicleId: code },
    select: { eventPhotoObjectKey: true },
  });
  if (rv?.eventPhotoObjectKey) return rv.eventPhotoObjectKey;

  const prefix = code.split("-")[0];
  if (!prefix) return null;

  const events = await prisma.event.findMany({
    where: { smsVotePrefix: prefix },
    select: { id: true },
  });
  if (events.length === 0) return null;

  const guestRegs = await prisma.registration.findMany({
    where: {
      eventId: { in: events.map((e) => e.id) },
      userId: null,
      NOT: { guestVehicles: { equals: Prisma.DbNull } },
    },
    select: { guestVehicles: true },
  });

  for (const reg of guestRegs) {
    const list = Array.isArray(reg.guestVehicles)
      ? (reg.guestVehicles as GuestVehicleRecord[])
      : [];
    for (const gv of list) {
      if (gv.publicVehicleId?.trim().toUpperCase() !== code) continue;
      const staffKey = (
        gv as GuestVehicleRecord & { staffPhotoObjectKey?: string | null }
      ).staffPhotoObjectKey;
      if (staffKey?.trim()) return staffKey.trim();
    }
  }

  return null;
}
