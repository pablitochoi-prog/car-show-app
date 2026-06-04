import type { EventJudgeCategoryAssignmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export function normalizeJudgingSectionName(name: string): string {
  return name.trim().toLowerCase();
}

export type JudgeCategoryAssignmentRow = {
  eventJudgingSectionId: string;
  status: EventJudgeCategoryAssignmentStatus;
  sectionName: string;
};

export function buildAssignmentLookups(assignments: JudgeCategoryAssignmentRow[]) {
  const byEventSectionId = new Map<
    string,
    { status: EventJudgeCategoryAssignmentStatus; sectionName: string }
  >();
  const eventSectionIdByName = new Map<string, string>();

  for (const row of assignments) {
    byEventSectionId.set(row.eventJudgingSectionId, {
      status: row.status,
      sectionName: row.sectionName,
    });
    eventSectionIdByName.set(
      normalizeJudgingSectionName(row.sectionName),
      row.eventJudgingSectionId,
    );
  }

  return { byEventSectionId, eventSectionIdByName };
}

export function resolveSheetSectionAssignment(
  sheetSection: { eventJudgingSectionId: string | null; name: string },
  lookups: ReturnType<typeof buildAssignmentLookups>,
): {
  assignmentStatus: EventJudgeCategoryAssignmentStatus | null;
  isAssigned: boolean;
  resolvedEventJudgingSectionId: string | null;
} {
  const directId = sheetSection.eventJudgingSectionId;
  if (directId) {
    const direct = lookups.byEventSectionId.get(directId);
    if (direct) {
      return {
        assignmentStatus: direct.status,
        isAssigned: true,
        resolvedEventJudgingSectionId: directId,
      };
    }
  }

  const byName = lookups.eventSectionIdByName.get(
    normalizeJudgingSectionName(sheetSection.name),
  );
  if (byName) {
    const row = lookups.byEventSectionId.get(byName)!;
    return {
      assignmentStatus: row.status,
      isAssigned: true,
      resolvedEventJudgingSectionId: byName,
    };
  }

  return {
    assignmentStatus: null,
    isAssigned: false,
    resolvedEventJudgingSectionId: directId,
  };
}

/** Same rules as the scorecard UI: assigned, not submitted, resolved by id or name. */
export function isSheetSectionSavable(
  sheetSection: { eventJudgingSectionId: string | null; name: string },
  lookups: ReturnType<typeof buildAssignmentLookups>,
): boolean {
  const resolved = resolveSheetSectionAssignment(sheetSection, lookups);
  return (
    resolved.isAssigned &&
    resolved.assignmentStatus !== "SUBMITTED" &&
    resolved.assignmentStatus !== null
  );
}

export async function resolveEventSectionIdsForAssignmentUpdate(input: {
  eventId: string;
  judgeUserId: string;
  registrationVehicleId: string;
  sheetSections: Array<{
    id: string;
    eventJudgingSectionId: string | null;
    name: string;
  }>;
  sheetSectionIds: string[];
}): Promise<string[]> {
  const targets = input.sheetSections.filter((s) =>
    input.sheetSectionIds.includes(s.id),
  );

  const assignments = await prisma.eventJudgeCategoryAssignment.findMany({
    where: {
      eventId: input.eventId,
      judgeUserId: input.judgeUserId,
      registrationVehicleId: input.registrationVehicleId,
    },
    include: { section: { select: { name: true } } },
  });

  const lookups = buildAssignmentLookups(
    assignments.map((a) => ({
      eventJudgingSectionId: a.eventJudgingSectionId,
      status: a.status,
      sectionName: a.section.name,
    })),
  );

  const eventSectionIds = new Set<string>();
  const backfills: Array<{ sheetSectionId: string; eventSectionId: string }> =
    [];

  for (const sheetSection of targets) {
    const resolved = resolveSheetSectionAssignment(sheetSection, lookups);
    if (!resolved.resolvedEventJudgingSectionId || !resolved.isAssigned) {
      continue;
    }
    eventSectionIds.add(resolved.resolvedEventJudgingSectionId);
    if (
      sheetSection.eventJudgingSectionId !==
      resolved.resolvedEventJudgingSectionId
    ) {
      backfills.push({
        sheetSectionId: sheetSection.id,
        eventSectionId: resolved.resolvedEventJudgingSectionId,
      });
    }
  }

  if (backfills.length > 0) {
    await Promise.all(
      backfills.map((b) =>
        prisma.judgeScoreSheetSection.update({
          where: { id: b.sheetSectionId },
          data: { eventJudgingSectionId: b.eventSectionId },
        }),
      ),
    );
  }

  return [...eventSectionIds];
}

/** Updates assignment rows by matching category name (reliable when sheet section ids are stale). */
export async function updateAssignmentStatusesForSheetSections(input: {
  eventId: string;
  judgeUserId: string;
  registrationVehicleId: string;
  sheetSections: Array<{ id: string; name: string }>;
  sheetSectionIds: string[];
  status: EventJudgeCategoryAssignmentStatus;
}): Promise<number> {
  const targetNameKeys = new Set(
    input.sheetSections
      .filter((s) => input.sheetSectionIds.includes(s.id))
      .map((s) => normalizeJudgingSectionName(s.name)),
  );

  if (targetNameKeys.size === 0) return 0;

  const assignments = await prisma.eventJudgeCategoryAssignment.findMany({
    where: {
      eventId: input.eventId,
      judgeUserId: input.judgeUserId,
      registrationVehicleId: input.registrationVehicleId,
    },
    select: { id: true, section: { select: { name: true } } },
  });

  const assignmentIds = assignments
    .filter((a) =>
      targetNameKeys.has(normalizeJudgingSectionName(a.section.name)),
    )
    .map((a) => a.id);

  if (assignmentIds.length === 0) return 0;

  await prisma.eventJudgeCategoryAssignment.updateMany({
    where: { id: { in: assignmentIds } },
    data: { status: input.status },
  });

  return assignmentIds.length;
}

export async function findAssignmentsForScoreSheet(input: {
  sheetId: string;
  eventId: string;
  judgeUserId: string;
  registrationVehicleId?: string | null;
  vehicleEntryCode?: string;
}) {
  let rows = await prisma.eventJudgeCategoryAssignment.findMany({
    where: {
      judgeScoreSheetId: input.sheetId,
      eventId: input.eventId,
      judgeUserId: input.judgeUserId,
    },
    include: { section: { select: { id: true, name: true } } },
  });

  if (rows.length === 0 && input.registrationVehicleId) {
    rows = await prisma.eventJudgeCategoryAssignment.findMany({
      where: {
        eventId: input.eventId,
        judgeUserId: input.judgeUserId,
        registrationVehicleId: input.registrationVehicleId,
      },
      include: { section: { select: { id: true, name: true } } },
    });
  }

  if (rows.length === 0 && input.vehicleEntryCode) {
    rows = await prisma.eventJudgeCategoryAssignment.findMany({
      where: {
        eventId: input.eventId,
        judgeUserId: input.judgeUserId,
        vehicleEntryCode: input.vehicleEntryCode.trim().toUpperCase(),
      },
      include: { section: { select: { id: true, name: true } } },
    });
  }

  return rows;
}
