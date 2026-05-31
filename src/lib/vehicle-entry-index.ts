import {
  Prisma,
  type PrismaClient,
  type VehicleEntryIndexType,
} from "@prisma/client";
import type { GuestVehicleRecord } from "@/lib/event-sms-vehicle-id";
import { normalizeLoosePublicVehicleId } from "@/lib/event-sms-vehicle-id";
import { normalizeVehicleEntryCode } from "@/lib/vehicle-entry-code";

export const VEHICLE_ENTRY_INDEX_TYPES = {
  registrationVehicle: "REGISTRATION_VEHICLE",
  guestJson: "GUEST_JSON",
} as const satisfies Record<string, VehicleEntryIndexType>;

export type VehicleEntryIndexUpsertInput = {
  publicVehicleId: string;
  eventId: string;
  registrationId: string;
  entryType: VehicleEntryIndexType;
  registrationVehicleId?: string | null;
  guestVehicleIndex?: number | null;
};

/** Normalize and validate a vehicle entry code for index storage. */
export function normalizeVehicleEntryIndexCode(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  return normalizeLoosePublicVehicleId(raw.trim()) ?? normalizeVehicleEntryCode(raw);
}

export type ParsedGuestVehicleIndexRow = {
  guestVehicleIndex: number;
  publicVehicleId: string;
};

/**
 * Parse guest JSON vehicles for index upsert. Skips malformed rows without throwing.
 */
export function parseGuestVehiclesForEntryIndex(
  guestVehicles: unknown,
): ParsedGuestVehicleIndexRow[] {
  if (guestVehicles == null || guestVehicles === Prisma.DbNull) return [];
  if (!Array.isArray(guestVehicles)) return [];

  const out: ParsedGuestVehicleIndexRow[] = [];
  for (let i = 0; i < guestVehicles.length; i++) {
    const row = guestVehicles[i];
    if (row == null || typeof row !== "object" || Array.isArray(row)) continue;
    const gv = row as GuestVehicleRecord;
    const code = normalizeVehicleEntryIndexCode(gv.publicVehicleId);
    if (!code) continue;
    out.push({ guestVehicleIndex: i, publicVehicleId: code });
  }
  return out;
}

export type DesiredVehicleEntryIndexRow = VehicleEntryIndexUpsertInput;

/** Fields compared for create/update/no-op decisions (timestamps excluded). */
export type VehicleEntryIndexMeaningfulRow = {
  publicVehicleId: string;
  eventId: string;
  registrationId: string;
  entryType: VehicleEntryIndexType;
  registrationVehicleId: string | null;
  guestVehicleIndex: number | null;
};

export function normalizeVehicleEntryIndexMeaningfulRow(
  input: VehicleEntryIndexUpsertInput,
): VehicleEntryIndexMeaningfulRow {
  const code = normalizeVehicleEntryIndexCode(input.publicVehicleId);
  if (!code) {
    throw new Error("Invalid public vehicle id for vehicle entry index.");
  }

  return {
    publicVehicleId: code,
    eventId: input.eventId,
    registrationId: input.registrationId,
    entryType: input.entryType,
    registrationVehicleId: input.registrationVehicleId ?? null,
    guestVehicleIndex: input.guestVehicleIndex ?? null,
  };
}

export function vehicleEntryIndexRowsMatch(
  existing: VehicleEntryIndexMeaningfulRow,
  desired: VehicleEntryIndexMeaningfulRow,
): boolean {
  return (
    existing.publicVehicleId === desired.publicVehicleId &&
    existing.eventId === desired.eventId &&
    existing.registrationId === desired.registrationId &&
    existing.entryType === desired.entryType &&
    existing.registrationVehicleId === desired.registrationVehicleId &&
    existing.guestVehicleIndex === desired.guestVehicleIndex
  );
}

/**
 * Build desired index rows for a registration (member RV rows win over guest JSON for same code).
 */
export function buildDesiredVehicleEntryIndexRows(args: {
  eventId: string;
  registrationId: string;
  registrationVehicles: Array<{
    id: string;
    publicVehicleId: string | null;
  }>;
  guestVehicles: unknown;
}): DesiredVehicleEntryIndexRow[] {
  const byCode = new Map<string, DesiredVehicleEntryIndexRow>();

  for (const rv of args.registrationVehicles) {
    const code = normalizeVehicleEntryIndexCode(rv.publicVehicleId);
    if (!code) continue;
    byCode.set(code, {
      publicVehicleId: code,
      eventId: args.eventId,
      registrationId: args.registrationId,
      entryType: VEHICLE_ENTRY_INDEX_TYPES.registrationVehicle,
      registrationVehicleId: rv.id,
      guestVehicleIndex: null,
    });
  }

  for (const guest of parseGuestVehiclesForEntryIndex(args.guestVehicles)) {
    if (byCode.has(guest.publicVehicleId)) continue;
    byCode.set(guest.publicVehicleId, {
      publicVehicleId: guest.publicVehicleId,
      eventId: args.eventId,
      registrationId: args.registrationId,
      entryType: VEHICLE_ENTRY_INDEX_TYPES.guestJson,
      registrationVehicleId: null,
      guestVehicleIndex: guest.guestVehicleIndex,
    });
  }

  return [...byCode.values()];
}

/** Redact PII and full vehicle codes from backfill error text. */
export function sanitizeBackfillErrorMessage(raw: string): string {
  let msg = raw;
  msg = msg.replace(
    /[A-HJ-NP-Z0-9]{3}-\d{3}/gi,
    (match) => `${match.slice(0, 3)}-***`,
  );
  msg = msg.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[email]");
  msg = msg.replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[phone]");
  if (msg.length > 240) {
    msg = `${msg.slice(0, 237)}...`;
  }
  return msg;
}

export function classifyBackfillError(err: unknown): {
  errorType: string;
  message: string;
} {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2021") {
      return {
        errorType: "table_missing",
        message:
          "vehicle_entry_index table is missing; run db:migrate before apply backfill",
      };
    }
    return {
      errorType: `prisma_${err.code}`,
      message: sanitizeBackfillErrorMessage(err.message),
    };
  }

  if (err instanceof Error) {
    const lower = err.message.toLowerCase();
    if (
      lower.includes("vehicle_entry_index") &&
      (lower.includes("does not exist") || lower.includes("not exist"))
    ) {
      return {
        errorType: "table_missing",
        message:
          "vehicle_entry_index table is missing; run db:migrate before apply backfill",
      };
    }
    return {
      errorType: err.name || "error",
      message: sanitizeBackfillErrorMessage(err.message),
    };
  }

  return {
    errorType: "unknown",
    message: "Unexpected backfill error",
  };
}

export function isVehicleEntryIndexTableMissingError(err: unknown): boolean {
  return classifyBackfillError(err).errorType === "table_missing";
}

/** Count guest JSON rows that cannot be indexed (malformed or missing code). */
export function countSkippedGuestVehicleRows(guestVehicles: unknown): number {
  if (guestVehicles == null || guestVehicles === Prisma.DbNull) return 0;
  if (!Array.isArray(guestVehicles)) return 1;

  let skipped = 0;
  for (const row of guestVehicles) {
    if (row == null || typeof row !== "object" || Array.isArray(row)) {
      skipped++;
      continue;
    }
    const gv = row as GuestVehicleRecord;
    if (!normalizeVehicleEntryIndexCode(gv.publicVehicleId)) {
      skipped++;
    }
  }
  return skipped;
}

export type VehicleEntryIndexBackfillErrorSummary = {
  registrationId: string;
  eventId: string;
  errorType: string;
  message: string;
};

export async function loadExistingVehicleEntryIndexMap(
  db: PrismaClient,
): Promise<Map<string, VehicleEntryIndexMeaningfulRow> | null> {
  try {
    const rows = await db.vehicleEntryIndex.findMany({
      select: {
        publicVehicleId: true,
        eventId: true,
        registrationId: true,
        entryType: true,
        registrationVehicleId: true,
        guestVehicleIndex: true,
      },
    });
    return new Map(rows.map((row) => [row.publicVehicleId, row]));
  } catch (err) {
    if (isVehicleEntryIndexTableMissingError(err)) {
      return null;
    }
    throw err;
  }
}

export function simulateDryRunIndexCounts(args: {
  registrationId: string;
  desired: DesiredVehicleEntryIndexRow[];
  existingByCode: Map<string, VehicleEntryIndexMeaningfulRow> | null;
}): { created: number; updated: number; skipped: number } {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of args.desired) {
    if (!args.existingByCode) {
      created++;
      continue;
    }

    const desired = normalizeVehicleEntryIndexMeaningfulRow(row);
    const existing = args.existingByCode.get(desired.publicVehicleId);

    if (!existing) {
      created++;
      continue;
    }

    if (existing.registrationId !== args.registrationId) {
      skipped++;
      continue;
    }

    if (vehicleEntryIndexRowsMatch(existing, desired)) {
      continue;
    }

    updated++;
  }

  return { created, updated, skipped };
}

type Tx = Prisma.TransactionClient;

export async function upsertVehicleEntryIndexRow(
  tx: Tx,
  input: VehicleEntryIndexUpsertInput,
): Promise<"created" | "updated" | "unchanged"> {
  const desired = normalizeVehicleEntryIndexMeaningfulRow(input);

  const existing = await tx.vehicleEntryIndex.findUnique({
    where: { publicVehicleId: desired.publicVehicleId },
    select: {
      id: true,
      publicVehicleId: true,
      eventId: true,
      registrationId: true,
      entryType: true,
      registrationVehicleId: true,
      guestVehicleIndex: true,
    },
  });

  if (!existing) {
    await tx.vehicleEntryIndex.create({
      data: desired,
    });
    return "created";
  }

  if (vehicleEntryIndexRowsMatch(existing, desired)) {
    return "unchanged";
  }

  await tx.vehicleEntryIndex.update({
    where: { id: existing.id },
    data: {
      eventId: desired.eventId,
      registrationId: desired.registrationId,
      entryType: desired.entryType,
      registrationVehicleId: desired.registrationVehicleId,
      guestVehicleIndex: desired.guestVehicleIndex,
    },
  });
  return "updated";
}

export type VehicleEntryIndexConflict = {
  publicVehicleIdPrefix: string;
  reason: "code_owned_by_other_registration";
};

/**
 * Reconcile index rows for one registration: remove stale rows, upsert current vehicles.
 */
export async function syncVehicleEntryIndexForRegistration(
  tx: Tx,
  registrationId: string,
): Promise<{
  created: number;
  updated: number;
  removed: number;
  skipped: number;
  conflicts: VehicleEntryIndexConflict[];
}> {
  const reg = await tx.registration.findUnique({
    where: { id: registrationId },
    select: {
      eventId: true,
      guestVehicles: true,
      vehicles: {
        select: { id: true, publicVehicleId: true },
      },
    },
  });

  if (!reg) {
    return {
      created: 0,
      updated: 0,
      removed: 0,
      skipped: 0,
      conflicts: [],
    };
  }

  const desired = buildDesiredVehicleEntryIndexRows({
    eventId: reg.eventId,
    registrationId,
    registrationVehicles: reg.vehicles,
    guestVehicles: reg.guestVehicles,
  });

  const desiredCodes = new Set(desired.map((d) => d.publicVehicleId));

  const existingForReg = await tx.vehicleEntryIndex.findMany({
    where: { registrationId },
    select: { id: true, publicVehicleId: true },
  });

  let removed = 0;
  for (const row of existingForReg) {
    if (!desiredCodes.has(row.publicVehicleId)) {
      await tx.vehicleEntryIndex.delete({ where: { id: row.id } });
      removed++;
    }
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const conflicts: VehicleEntryIndexConflict[] = [];

  for (const row of desired) {
    const code = row.publicVehicleId;
    const owned = await tx.vehicleEntryIndex.findUnique({
      where: { publicVehicleId: code },
      select: { registrationId: true },
    });
    if (owned && owned.registrationId !== registrationId) {
      skipped++;
      conflicts.push({
        publicVehicleIdPrefix: code.split("-")[0] ?? code,
        reason: "code_owned_by_other_registration",
      });
      continue;
    }

    const result = await upsertVehicleEntryIndexRow(tx, row);
    if (result === "created") created++;
    else if (result === "updated") updated++;
  }

  return { created, updated, removed, skipped, conflicts };
}

export type VehicleEntryIndexBackfillStats = {
  registrationsScanned: number;
  memberVehiclesScanned: number;
  guestVehiclesScanned: number;
  indexRecordsCreated: number;
  indexRecordsUpdated: number;
  skippedRecords: number;
  errors: number;
  /** False when dry-run could not read vehicle_entry_index (migration not applied). */
  indexLookupAvailable: boolean;
  errorSummaries: VehicleEntryIndexBackfillErrorSummary[];
  warnings: string[];
};

export async function backfillVehicleEntryIndex(
  db: PrismaClient,
  options: { dryRun?: boolean } = {},
): Promise<VehicleEntryIndexBackfillStats> {
  const dryRun = options.dryRun ?? false;
  const stats: VehicleEntryIndexBackfillStats = {
    registrationsScanned: 0,
    memberVehiclesScanned: 0,
    guestVehiclesScanned: 0,
    indexRecordsCreated: 0,
    indexRecordsUpdated: 0,
    skippedRecords: 0,
    errors: 0,
    indexLookupAvailable: true,
    errorSummaries: [],
    warnings: [],
  };

  const registrations = await db.registration.findMany({
    where: {
      OR: [
        { vehicles: { some: { publicVehicleId: { not: null } } } },
        { NOT: { guestVehicles: { equals: Prisma.DbNull } } },
      ],
    },
    select: {
      id: true,
      eventId: true,
      guestVehicles: true,
      vehicles: { select: { id: true, publicVehicleId: true } },
    },
  });

  let existingByCode: Map<string, VehicleEntryIndexMeaningfulRow> | null = null;
  if (dryRun) {
    try {
      existingByCode = await loadExistingVehicleEntryIndexMap(db);
    } catch (err) {
      const classified = classifyBackfillError(err);
      stats.indexLookupAvailable = false;
      stats.warnings.push(classified.message);
    }

    if (existingByCode === null) {
      stats.indexLookupAvailable = false;
      if (
        !stats.warnings.some((warning) =>
          warning.includes("vehicle_entry_index table is missing"),
        )
      ) {
        stats.warnings.push(
          "vehicle_entry_index table is missing; dry-run create/update counts assume all rows would be created",
        );
      }
    }
  }

  for (const reg of registrations) {
    stats.registrationsScanned++;
    stats.memberVehiclesScanned += reg.vehicles.filter(
      (v) => normalizeVehicleEntryIndexCode(v.publicVehicleId),
    ).length;
    stats.guestVehiclesScanned += parseGuestVehiclesForEntryIndex(
      reg.guestVehicles,
    ).length;
    stats.skippedRecords += countSkippedGuestVehicleRows(reg.guestVehicles);

    try {
      const desired = buildDesiredVehicleEntryIndexRows({
        eventId: reg.eventId,
        registrationId: reg.id,
        registrationVehicles: reg.vehicles,
        guestVehicles: reg.guestVehicles,
      });

      if (dryRun) {
        const simulated = simulateDryRunIndexCounts({
          registrationId: reg.id,
          desired,
          existingByCode,
        });
        stats.indexRecordsCreated += simulated.created;
        stats.indexRecordsUpdated += simulated.updated;
        stats.skippedRecords += simulated.skipped;
        continue;
      }

      const result = await db.$transaction(async (tx) =>
        syncVehicleEntryIndexForRegistration(tx, reg.id),
      );
      stats.indexRecordsCreated += result.created;
      stats.indexRecordsUpdated += result.updated;
      stats.skippedRecords += result.skipped;
    } catch (err) {
      stats.errors++;
      const classified = classifyBackfillError(err);
      stats.errorSummaries.push({
        registrationId: reg.id,
        eventId: reg.eventId,
        errorType: classified.errorType,
        message: classified.message,
      });
    }
  }

  return stats;
}
