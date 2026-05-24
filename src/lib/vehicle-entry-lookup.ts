import { Prisma } from "@prisma/client";
import type { GuestVehicleRecord } from "@/lib/event-sms-vehicle-id";
import { prisma } from "@/lib/db";
import { normalizeVehicleEntryCode } from "@/lib/vehicle-entry-code";
import type { VehicleEntryRecord } from "@/lib/vehicle-entry-types";

function publicVehiclePhotoPath(vehicleEntryCode: string): string {
  return `/api/v/${encodeURIComponent(vehicleEntryCode)}/photo`;
}

const eventSelect = {
  id: true,
  name: true,
  status: true,
  startDate: true,
  endDate: true,
  venue: true,
  city: true,
  state: true,
} as const;

function categoryLabel(
  row: {
    customName: string | null;
    category: { name: string } | null;
  } | null,
): string {
  if (!row) return "Class — to be assigned";
  return row.customName?.trim() || row.category?.name || "Class";
}

function buildFromRegistrationVehicle(
  rv: {
    id: string;
    vehicleId: string;
    eventPhotoObjectKey: string | null;
    vehicleQrObjectKey: string | null;
    vehicleQrUrl: string | null;
    votingStatus: string | null;
    judgingStatus: string | null;
    vehicle: {
      year: number;
      make: string;
      model: string;
      trim: string | null;
      nickname: string | null;
      photoUrl: string | null;
    };
    eventCategory: {
      customName: string | null;
      category: { name: string } | null;
    } | null;
    registration: {
      id: string;
      eventId: string;
      event: VehicleEntryRecord["event"];
    };
  },
  code: string,
): VehicleEntryRecord {
  const { registration } = rv;
  const eventId = registration.eventId;
  let photoUrl: string | null = null;
  if (rv.eventPhotoObjectKey) {
    photoUrl = publicVehiclePhotoPath(code);
  } else {
    const legacy = rv.vehicle.photoUrl?.trim();
    if (legacy?.startsWith("http://") || legacy?.startsWith("https://")) {
      photoUrl = legacy;
    }
  }

  return {
    kind: "registration_vehicle",
    vehicleEntryCode: code,
    eventId,
    registrationId: registration.id,
    registrationVehicleId: rv.id,
    guestVehicleIndex: null,
    vehicleId: rv.vehicleId,
    year: rv.vehicle.year,
    make: rv.vehicle.make,
    model: rv.vehicle.model,
    trim: rv.vehicle.trim,
    nickname: rv.vehicle.nickname,
    classLabel: categoryLabel(rv.eventCategory),
    photoUrl,
    votingStatus: rv.votingStatus,
    judgingStatus: rv.judgingStatus,
    vehicleQrObjectKey: rv.vehicleQrObjectKey,
    vehicleQrUrl: rv.vehicleQrUrl,
    event: registration.event,
  };
}

function buildFromGuest(
  reg: {
    id: string;
    eventId: string;
    guestVehicles: unknown;
    event: VehicleEntryRecord["event"];
  },
  gv: GuestVehicleRecord,
  index: number,
  code: string,
  categoryMap: Map<string, string>,
): VehicleEntryRecord {
  let photoUrl: string | null = null;
  const guest = gv as GuestVehicleRecord & {
    staffPhotoObjectKey?: string | null;
  };
  if (guest.staffPhotoObjectKey) {
    photoUrl = publicVehiclePhotoPath(code);
  } else {
    const legacy = gv.photoUrl?.trim();
    if (legacy?.startsWith("http://") || legacy?.startsWith("https://")) {
      photoUrl = legacy;
    }
  }

  const classLabel = gv.eventCategoryId
    ? (categoryMap.get(gv.eventCategoryId) ?? "Class — to be assigned")
    : "Class — to be assigned";

  return {
    kind: "guest_json",
    vehicleEntryCode: code,
    eventId: reg.eventId,
    registrationId: reg.id,
    registrationVehicleId: null,
    guestVehicleIndex: index,
    vehicleId: null,
    year: gv.year ?? 0,
    make: (gv.make ?? "").trim() || "Vehicle",
    model: (gv.model ?? "").trim() || "",
    trim: gv.trim ?? null,
    nickname: gv.nickname?.trim() || null,
    classLabel,
    photoUrl,
    votingStatus: null,
    judgingStatus: null,
    vehicleQrObjectKey: null,
    vehicleQrUrl: null,
    event: reg.event,
  };
}

export async function findVehicleEntryByCode(
  rawCode: string,
): Promise<VehicleEntryRecord | null> {
  const code = normalizeVehicleEntryCode(rawCode);
  if (!code) return null;

  const rv = await prisma.registrationVehicle.findUnique({
    where: { publicVehicleId: code },
    include: {
      vehicle: true,
      eventCategory: { include: { category: { select: { name: true } } } },
      registration: { include: { event: { select: eventSelect } } },
    },
  });
  if (rv?.publicVehicleId) {
    return buildFromRegistrationVehicle(rv, code);
  }

  const prefix = code.split("-")[0];
  if (!prefix) return null;

  const events = await prisma.event.findMany({
    where: { smsVotePrefix: prefix },
    select: { id: true },
  });
  if (events.length === 0) return null;

  const eventIds = events.map((e) => e.id);
  const [categoryRows, guestRegs] = await Promise.all([
    prisma.eventCategory.findMany({
      where: { eventId: { in: eventIds } },
      select: {
        id: true,
        customName: true,
        category: { select: { name: true } },
      },
    }),
    prisma.registration.findMany({
      where: {
        eventId: { in: eventIds },
        userId: null,
        NOT: { guestVehicles: { equals: Prisma.DbNull } },
      },
      select: {
        id: true,
        eventId: true,
        guestVehicles: true,
        event: { select: eventSelect },
      },
    }),
  ]);

  const categoryMap = new Map(
    categoryRows.map((r) => [
      r.id,
      r.customName?.trim() || r.category?.name || "Class",
    ]),
  );

  for (const reg of guestRegs) {
    const list = Array.isArray(reg.guestVehicles)
      ? (reg.guestVehicles as GuestVehicleRecord[])
      : [];
    for (let i = 0; i < list.length; i++) {
      const gv = list[i]!;
      if (gv.publicVehicleId?.trim().toUpperCase() === code) {
        return buildFromGuest(reg, gv, i, code, categoryMap);
      }
    }
  }

  return null;
}
