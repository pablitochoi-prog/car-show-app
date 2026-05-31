import { Prisma, type PrismaClient } from "@prisma/client";
import {
  syncVehicleEntryIndexForRegistration,
  upsertVehicleEntryIndexRow,
  VEHICLE_ENTRY_INDEX_TYPES,
} from "@/lib/vehicle-entry-index";

/** A–Z without I or O — easier to read and text (24³ prefixes per event). */
export const VOTE_PREFIX_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

/** Full public vehicle id: `ABC-005` (3 letters + hyphen + 3 digits). */
export const PUBLIC_VEHICLE_ID_REGEX = /^[A-HJ-NP-Z]{3}-\d{3}$/;

export function isValidVotePrefix(prefix: string): boolean {
  return prefix.length === 3 && /^[A-HJ-NP-Z]{3}$/.test(prefix);
}

export function isValidPublicVehicleId(id: string): boolean {
  return PUBLIC_VEHICLE_ID_REGEX.test(id.trim().toUpperCase());
}

/** Stored dash-card ids may use legacy alphanumeric prefixes (e.g. 53X-006). */
const LOOSE_PUBLIC_VEHICLE_ID_REGEX = /^[A-Z0-9]{3}-\d{3}$/;

/** Canonical form for lookup/SMS when strict letter-only prefix does not apply. */
export function normalizeLoosePublicVehicleId(raw: string): string | null {
  const trimmed = raw.trim().toUpperCase();
  if (isValidPublicVehicleId(trimmed)) return trimmed;
  if (LOOSE_PUBLIC_VEHICLE_ID_REGEX.test(trimmed)) return trimmed;
  return null;
}

export function generateRandomVotePrefix(): string {
  let s = "";
  for (let i = 0; i < 3; i++) {
    s += VOTE_PREFIX_LETTERS[Math.floor(Math.random() * VOTE_PREFIX_LETTERS.length)]!;
  }
  return s;
}

/** Assign a unique 3-character prefix to an event (call inside a transaction). */
export async function ensureEventSmsVotePrefix(
  tx: Prisma.TransactionClient,
  eventId: string,
): Promise<string> {
  const existing = await tx.event.findUnique({
    where: { id: eventId },
    select: { smsVotePrefix: true },
  });
  if (existing?.smsVotePrefix) {
    return existing.smsVotePrefix;
  }

  for (let attempt = 0; attempt < 120; attempt++) {
    const candidate = generateRandomVotePrefix();
    try {
      await tx.event.update({
        where: { id: eventId },
        data: { smsVotePrefix: candidate },
      });
      return candidate;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        continue;
      }
      throw e;
    }
  }

  throw new Error("Could not allocate a unique vote prefix for this event.");
}

const MAX_EVENT_VEHICLES = 999;

/** Reserve `count` consecutive public vehicle IDs for an event (e.g. ABC-001). */
export async function reserveVehiclePublicIds(
  tx: Prisma.TransactionClient,
  eventId: string,
  count: number,
): Promise<string[]> {
  if (count <= 0) return [];

  await ensureEventSmsVotePrefix(tx, eventId);

  const before = await tx.event.findUnique({
    where: { id: eventId },
    select: { nextVehicleNumber: true, smsVotePrefix: true },
  });
  if (!before?.smsVotePrefix) {
    throw new Error("Event vote prefix missing after ensure.");
  }
  const startAt = before.nextVehicleNumber;
  if (startAt + count - 1 > MAX_EVENT_VEHICLES) {
    throw new Error(
      "This event has reached the maximum number of registered vehicles (999).",
    );
  }

  const rows = await tx.$queryRaw<Array<{ nextVehicleNumber: number }>>`
    UPDATE events
    SET "nextVehicleNumber" = "nextVehicleNumber" + ${count}
    WHERE id = ${eventId}
    RETURNING "nextVehicleNumber"
  `;
  const nextAfter = rows[0]?.nextVehicleNumber;
  if (nextAfter == null) {
    throw new Error("Event not found when reserving vehicle IDs.");
  }

  const startNum = nextAfter - count;
  const prefix = before.smsVotePrefix;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const n = startNum + i;
    out.push(`${prefix}-${String(n).padStart(3, "0")}`);
  }
  return out;
}

export function parseNumericSuffixFromPublicVehicleId(
  publicVehicleId: string,
): number {
  const part = publicVehicleId.split("-")[1];
  if (!part) return 0;
  const n = Number.parseInt(part, 10);
  return Number.isFinite(n) ? n : 0;
}

function displayNumberFromPublicId(publicVehicleId: string): number {
  return parseNumericSuffixFromPublicVehicleId(publicVehicleId);
}

/**
 * Backfill null `publicVehicleId` rows for an event (stable global ordering for legacy data).
 */
export async function repairLegacyVehiclePublicIdsForEvent(
  tx: Prisma.TransactionClient,
  eventId: string,
): Promise<void> {
  const missing = await tx.registrationVehicle.findMany({
    where: {
      publicVehicleId: null,
      registration: { eventId },
    },
    orderBy: [{ registration: { createdAt: "asc" } }, { id: "asc" }],
    select: { id: true, registrationId: true },
  });
  if (missing.length === 0) return;

  const ids = await reserveVehiclePublicIds(tx, eventId, missing.length);
  for (let i = 0; i < missing.length; i++) {
    const pid = ids[i]!;
    const row = missing[i]!;
    await tx.registrationVehicle.update({
      where: { id: row.id },
      data: {
        publicVehicleId: pid,
        displayNumber: displayNumberFromPublicId(pid),
      },
    });
    await upsertVehicleEntryIndexRow(tx, {
      publicVehicleId: pid,
      eventId,
      registrationId: row.registrationId,
      entryType: VEHICLE_ENTRY_INDEX_TYPES.registrationVehicle,
      registrationVehicleId: row.id,
      guestVehicleIndex: null,
    });
  }
}

export async function replaceAllRegistrationVehiclesWithPublicIds(
  tx: Prisma.TransactionClient,
  eventId: string,
  registrationId: string,
  vehicleIdsInOrder: string[],
  vehicleCategories: Record<string, string | null | undefined>,
): Promise<void> {
  await repairLegacyVehiclePublicIdsForEvent(tx, eventId);
  await tx.registrationVehicle.deleteMany({ where: { registrationId } });
  const reserved = await reserveVehiclePublicIds(
    tx,
    eventId,
    vehicleIdsInOrder.length,
  );
  for (let i = 0; i < vehicleIdsInOrder.length; i++) {
    const vid = vehicleIdsInOrder[i]!;
    const pid = reserved[i]!;
    await tx.registrationVehicle.create({
      data: {
        registrationId,
        vehicleId: vid,
        eventCategoryId: vehicleCategories[vid] ?? null,
        publicVehicleId: pid,
        displayNumber: displayNumberFromPublicId(pid),
      },
    });
  }

  await syncVehicleEntryIndexForRegistration(tx, registrationId);
}

export async function syncRegistrationVehiclesWithPublicIds(
  tx: Prisma.TransactionClient,
  eventId: string,
  registrationId: string,
  vehicleIdsInOrder: string[],
  vehicleCategories: Record<string, string | null | undefined>,
): Promise<void> {
  await repairLegacyVehiclePublicIdsForEvent(tx, eventId);

  await tx.registrationVehicle.deleteMany({
    where: {
      registrationId,
      vehicleId: { notIn: vehicleIdsInOrder },
    },
  });

  const kept = await tx.registrationVehicle.findMany({
    where: { registrationId, vehicleId: { in: vehicleIdsInOrder } },
    select: { vehicleId: true },
  });
  const keptSet = new Set(kept.map((r) => r.vehicleId));
  const newCount = vehicleIdsInOrder.filter((v) => !keptSet.has(v)).length;
  const reserved =
    newCount > 0 ? await reserveVehiclePublicIds(tx, eventId, newCount) : [];
  let reservedIdx = 0;

  const upsertRows = await tx.registrationVehicle.findMany({
    where: { registrationId, vehicleId: { in: vehicleIdsInOrder } },
  });
  const byVehicleId = new Map(
    upsertRows.map((row) => [row.vehicleId, row] as const),
  );

  for (const vid of vehicleIdsInOrder) {
    const cat = vehicleCategories[vid] ?? null;
    const existing = byVehicleId.get(vid);
    if (existing) {
      await tx.registrationVehicle.update({
        where: { id: existing.id },
        data: { eventCategoryId: cat },
      });
    } else {
      const pid = reserved[reservedIdx++]!;
      await tx.registrationVehicle.create({
        data: {
          registrationId,
          vehicleId: vid,
          eventCategoryId: cat,
          publicVehicleId: pid,
          displayNumber: displayNumberFromPublicId(pid),
        },
      });
    }
  }

  await syncVehicleEntryIndexForRegistration(tx, registrationId);
}

/** Allocate prefix and return it for a brand-new event row (use before create). */
export async function allocateUniqueVotePrefixForNewEvent(
  tx: Prisma.TransactionClient,
): Promise<string> {
  for (let attempt = 0; attempt < 120; attempt++) {
    const candidate = generateRandomVotePrefix();
    const hit = await tx.event.findUnique({
      where: { smsVotePrefix: candidate },
      select: { id: true },
    });
    if (!hit) return candidate;
  }
  throw new Error("Could not allocate a unique vote prefix.");
}

/**
 * One-shot maintenance: ensure every event has a prefix and every registration vehicle has a public ID;
 * then align `nextVehicleNumber` so it is above every assigned display number.
 */
/** Guest vehicle JSON stored on `Registration.guestVehicles` (includes show ID at registration). */
export type GuestVehicleRecord = {
  year: number;
  make: string;
  model: string;
  trim?: string | null;
  nickname?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  eventCategoryId?: string | null;
  /** Assigned when the guest registers — used for pre-printed dash cards. */
  publicVehicleId?: string;
};

/** Reserve and attach `publicVehicleId` to each guest vehicle payload (call inside a transaction). */
export async function assignPublicIdsToGuestVehiclePayloads(
  tx: Prisma.TransactionClient,
  eventId: string,
  vehicles: Omit<GuestVehicleRecord, "publicVehicleId">[],
): Promise<GuestVehicleRecord[]> {
  if (vehicles.length === 0) return [];
  const reserved = await reserveVehiclePublicIds(tx, eventId, vehicles.length);
  return vehicles.map((v, i) => ({
    ...v,
    publicVehicleId: reserved[i]!,
  }));
}

/** Backfill `publicVehicleId` on guest JSON vehicles that registered before IDs were stored on guest rows. */
export async function backfillGuestVehiclePublicIdsInJson(
  db: PrismaClient,
): Promise<void> {
  const rows = await db.registration.findMany({
    where: {
      userId: null,
      NOT: { guestVehicles: { equals: Prisma.DbNull } },
    },
    select: { id: true, eventId: true, guestVehicles: true },
  });

  for (const row of rows) {
    const list = Array.isArray(row.guestVehicles)
      ? (row.guestVehicles as GuestVehicleRecord[])
      : [];
    const missing = list.filter((v) => !v.publicVehicleId?.trim()).length;
    if (missing === 0) continue;

    await db.$transaction(async (tx) => {
      const reserved = await reserveVehiclePublicIds(tx, row.eventId, missing);
      let idx = 0;
      const updated = list.map((v) => {
        if (v.publicVehicleId?.trim()) return v;
        return { ...v, publicVehicleId: reserved[idx++]! };
      });
      await tx.registration.update({
        where: { id: row.id },
        data: { guestVehicles: updated as Prisma.InputJsonValue },
      });
      await syncVehicleEntryIndexForRegistration(tx, row.id);
    });
  }
}

export async function backfillSmsVehicleIdsForAllEvents(
  db: PrismaClient,
): Promise<void> {
  const eventIds = (await db.event.findMany({ select: { id: true } })).map(
    (e) => e.id,
  );

  for (const eventId of eventIds) {
    await db.$transaction(async (tx) => {
      await ensureEventSmsVotePrefix(tx, eventId);
      await repairLegacyVehiclePublicIdsForEvent(tx, eventId);
    });
  }

  await backfillGuestVehiclePublicIdsInJson(db);

  for (const eventId of eventIds) {
    const agg = await db.registrationVehicle.aggregate({
      where: { registration: { eventId } },
      _max: { displayNumber: true },
    });
    const maxAssigned = agg._max.displayNumber ?? 0;
    const ev = await db.event.findUnique({
      where: { id: eventId },
      select: { nextVehicleNumber: true },
    });
    const next = Math.max(ev?.nextVehicleNumber ?? 1, maxAssigned + 1);
    await db.event.update({
      where: { id: eventId },
      data: { nextVehicleNumber: next },
    });
  }
}
