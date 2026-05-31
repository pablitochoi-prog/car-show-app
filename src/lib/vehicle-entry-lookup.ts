import { Prisma } from "@prisma/client";
import type { GuestVehicleRecord } from "@/lib/event-sms-vehicle-id";
import { prisma } from "@/lib/db";
import { normalizeVehicleEntryCode } from "@/lib/vehicle-entry-code";
import {
  resolveRegistrationVehicleNickname,
  resolveRegistrationVehicleStory,
} from "@/lib/registration-vehicle-event-copy";
import type { VehicleEntryRecord } from "@/lib/vehicle-entry-types";
import {
  logPerfTiming,
  perfTimingElapsed,
  perfTimingStart,
  vehicleEntryCodePrefix,
} from "@/lib/perf-timing";
import {
  isVehicleEntryIndexAnomalyLookupPath,
  logVehicleEntryIndexAnomaly,
} from "@/lib/structured-logging";

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

const registrationVehicleInclude = {
  vehicle: true,
  eventCategory: { include: { category: { select: { name: true } } } },
  registration: { include: { event: { select: eventSelect } } },
} as const;

/** Enabled by default; set VEHICLE_ENTRY_INDEX_LOOKUP_ENABLED=false to disable indexed lookup. */
export function isVehicleEntryIndexLookupEnabled(): boolean {
  const raw = process.env.VEHICLE_ENTRY_INDEX_LOOKUP_ENABLED;
  if (raw === undefined || raw.trim() === "") return true;
  return !["0", "false", "no", "off"].includes(raw.trim().toLowerCase());
}

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
    vehicleNickname: string | null;
    vehicleStory: string | null;
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
      notes: string | null;
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
    nickname: resolveRegistrationVehicleNickname(
      rv.vehicleNickname,
      rv.vehicle.nickname,
    ),
    vehicleStory: resolveRegistrationVehicleStory(
      rv.vehicleStory,
      rv.vehicle.notes,
    ),
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
    vehicleStory: gv.notes?.trim() || null,
    classLabel,
    photoUrl,
    votingStatus: null,
    judgingStatus: null,
    vehicleQrObjectKey: null,
    vehicleQrUrl: null,
    event: reg.event,
  };
}

function buildCategoryMap(
  categoryRows: Array<{
    id: string;
    customName: string | null;
    category: { name: string } | null;
  }>,
): Map<string, string> {
  return new Map(
    categoryRows.map((r) => [
      r.id,
      r.customName?.trim() || r.category?.name || "Class",
    ]),
  );
}

export type VehicleEntryIndexLookupPath =
  | "vehicle_entry_index_member"
  | "vehicle_entry_index_guest"
  | "vehicle_entry_index_miss"
  | "vehicle_entry_index_stale_fallback";

export type VehicleEntryIndexLookupResult =
  | {
      kind: "hit";
      entry: VehicleEntryRecord;
      lookupPath: "vehicle_entry_index_member" | "vehicle_entry_index_guest";
    }
  | {
      kind: "miss";
      lookupPath: "vehicle_entry_index_miss";
    }
  | {
      kind: "stale";
      lookupPath: "vehicle_entry_index_stale_fallback";
    };

export async function resolveVehicleEntryFromIndex(
  code: string,
): Promise<VehicleEntryIndexLookupResult> {
  const indexRow = await prisma.vehicleEntryIndex.findUnique({
    where: { publicVehicleId: code },
    select: {
      entryType: true,
      eventId: true,
      registrationId: true,
      registrationVehicleId: true,
      guestVehicleIndex: true,
    },
  });

  if (!indexRow) {
    return { kind: "miss", lookupPath: "vehicle_entry_index_miss" };
  }

  if (indexRow.entryType === "REGISTRATION_VEHICLE") {
    const rv = await prisma.registrationVehicle.findFirst({
      where: indexRow.registrationVehicleId
        ? {
            id: indexRow.registrationVehicleId,
            publicVehicleId: code,
            registrationId: indexRow.registrationId,
          }
        : {
            publicVehicleId: code,
            registrationId: indexRow.registrationId,
          },
      include: registrationVehicleInclude,
    });

    if (
      !rv?.publicVehicleId ||
      rv.registration.eventId !== indexRow.eventId
    ) {
      return { kind: "stale", lookupPath: "vehicle_entry_index_stale_fallback" };
    }

    return {
      kind: "hit",
      entry: buildFromRegistrationVehicle(rv, code),
      lookupPath: "vehicle_entry_index_member",
    };
  }

  if (indexRow.guestVehicleIndex == null) {
    return { kind: "stale", lookupPath: "vehicle_entry_index_stale_fallback" };
  }

  const reg = await prisma.registration.findUnique({
    where: { id: indexRow.registrationId },
    select: {
      id: true,
      eventId: true,
      guestVehicles: true,
      event: { select: eventSelect },
    },
  });

  if (!reg || reg.eventId !== indexRow.eventId) {
    return { kind: "stale", lookupPath: "vehicle_entry_index_stale_fallback" };
  }

  const list = Array.isArray(reg.guestVehicles)
    ? (reg.guestVehicles as GuestVehicleRecord[])
    : [];
  const guestIndex = indexRow.guestVehicleIndex;
  const gv = list[guestIndex];

  if (!gv || gv.publicVehicleId?.trim().toUpperCase() !== code) {
    return { kind: "stale", lookupPath: "vehicle_entry_index_stale_fallback" };
  }

  const categoryRows = await prisma.eventCategory.findMany({
    where: { eventId: reg.eventId },
    select: {
      id: true,
      customName: true,
      category: { select: { name: true } },
    },
  });

  return {
    kind: "hit",
    entry: buildFromGuest(
      reg,
      gv,
      guestIndex,
      code,
      buildCategoryMap(categoryRows),
    ),
    lookupPath: "vehicle_entry_index_guest",
  };
}

type LegacyLookupResult = {
  entry: VehicleEntryRecord | null;
  lookupPath: string;
  guestRegCount: number;
  eventId?: string;
};

export async function findVehicleEntryByCodeLegacy(
  code: string,
): Promise<LegacyLookupResult> {
  const rv = await prisma.registrationVehicle.findUnique({
    where: { publicVehicleId: code },
    include: registrationVehicleInclude,
  });
  if (rv?.publicVehicleId) {
    return {
      entry: buildFromRegistrationVehicle(rv, code),
      lookupPath: "registration_vehicle",
      guestRegCount: 0,
      eventId: rv.registration.eventId,
    };
  }

  const prefix = code.split("-")[0];
  if (!prefix) {
    return { entry: null, lookupPath: "invalid", guestRegCount: 0 };
  }

  const events = await prisma.event.findMany({
    where: { smsVotePrefix: prefix },
    select: { id: true },
  });
  if (events.length === 0) {
    return { entry: null, lookupPath: "prefix_miss", guestRegCount: 0 };
  }

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

  const categoryMap = buildCategoryMap(categoryRows);

  for (const reg of guestRegs) {
    const list = Array.isArray(reg.guestVehicles)
      ? (reg.guestVehicles as GuestVehicleRecord[])
      : [];
    for (let i = 0; i < list.length; i++) {
      const gv = list[i]!;
      if (gv.publicVehicleId?.trim().toUpperCase() === code) {
        return {
          entry: buildFromGuest(reg, gv, i, code, categoryMap),
          lookupPath: "guest_scan",
          guestRegCount: guestRegs.length,
          eventId: reg.eventId,
        };
      }
    }
  }

  return {
    entry: null,
    lookupPath: "guest_scan",
    guestRegCount: guestRegs.length,
  };
}

export async function findVehicleEntryByCode(
  rawCode: string,
): Promise<VehicleEntryRecord | null> {
  const start = perfTimingStart();
  const codePrefix = vehicleEntryCodePrefix(rawCode);
  let lookupPath = "not_found";
  let guestRegCount = 0;
  let eventId: string | undefined;
  let found = false;
  let indexMissOrStale = false;

  try {
    const code = normalizeVehicleEntryCode(rawCode);
    if (!code) {
      lookupPath = "invalid";
      return null;
    }

    if (isVehicleEntryIndexLookupEnabled()) {
      const indexResult = await resolveVehicleEntryFromIndex(code);
      if (indexResult.kind === "hit") {
        lookupPath = indexResult.lookupPath;
        eventId = indexResult.entry.eventId;
        found = true;
        return indexResult.entry;
      }

      lookupPath = indexResult.lookupPath;
      indexMissOrStale = true;
    }

    const legacy = await findVehicleEntryByCodeLegacy(code);
    guestRegCount = legacy.guestRegCount;

    if (legacy.entry) {
      lookupPath = legacy.lookupPath;
      eventId = legacy.eventId;
      found = true;
      return legacy.entry;
    }

    if (!indexMissOrStale) {
      lookupPath = legacy.lookupPath;
    }

    return null;
  } finally {
    logPerfTiming({
      name: "findVehicleEntryByCode",
      durationMs: perfTimingElapsed(start),
      success: found,
      codePrefix,
      lookupPath,
      guestRegCount,
      eventId,
    });

    if (isVehicleEntryIndexAnomalyLookupPath(lookupPath)) {
      logVehicleEntryIndexAnomaly({
        lookupPath,
        codePrefix,
        eventId,
        guestRegCount,
      });
    }
  }
}
