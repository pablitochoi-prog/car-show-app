import type { JudgeScoreSheetStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calculateScoreFromSnapshot } from "@/lib/judging/calculate-score-from-snapshot";
import { snapshotEventTemplateToScoreSheet } from "@/lib/judging/snapshot-score-sheet";
import { getUserEventRoles } from "@/lib/event-staff";

const JUDGE_SCORE_SHEET_ACCESS_ERROR_CODES = new Set([
  "NOT_JUDGE",
  "NOT_FOUND",
  "READ_ONLY",
  "INVALID_ITEM",
  "INVALID_POINTS",
  "INVALID_OPTION",
  "INVALID_DEDUCTION",
  "REQUIRED_COMMENT",
  "CLASS_NOT_FOUND",
  "VEHICLE_NOT_FOUND",
  "MISSING_CLASS",
  "NOT_ELIGIBLE",
  "CLASS_MISMATCH",
]);

export class JudgeScoreSheetAccessError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "JudgeScoreSheetAccessError";
    this.code = code;
    Object.setPrototypeOf(this, JudgeScoreSheetAccessError.prototype);
  }
}

export function isJudgeScoreSheetAccessError(
  err: unknown,
): err is JudgeScoreSheetAccessError {
  if (err instanceof JudgeScoreSheetAccessError) return true;
  if (typeof err !== "object" || err === null) return false;
  const code = (err as { code?: unknown }).code;
  return typeof code === "string" && JUDGE_SCORE_SHEET_ACCESS_ERROR_CODES.has(code);
}

export function judgeScoreSheetAccessErrorResponse(err: unknown) {
  if (isJudgeScoreSheetAccessError(err)) {
    const code = err instanceof JudgeScoreSheetAccessError ? err.code : String((err as { code: string }).code);
    const message =
      err instanceof Error ? err.message : "Score sheet request failed.";
    const status =
      code === "NOT_FOUND"
        ? 404
        : code === "NOT_JUDGE"
          ? 403
          : 400;
    return { status, body: { error: message, code } };
  }
  return null;
}

type SheetVehicleRow = {
  registrationVehicleId: string;
  registrationId: string;
  vehicleEntryCode: string;
  eventCategoryId: string | null;
  nickname: string | null;
  year: number;
  make: string;
  model: string;
};

type AssignmentClassRow = {
  id: string;
  name: string;
  description: string | null;
  eventJudgingTemplateId: string;
  template: { name: string; totalPoints: number };
  eligibleCategories: Array<{ eventCategoryId: string }>;
};

export async function assertJudgeForEvent(
  judgeUserId: string,
  eventId: string,
): Promise<void> {
  const roles = await getUserEventRoles(judgeUserId, eventId);
  if (!roles.includes("JUDGE")) {
    throw new JudgeScoreSheetAccessError(
      "NOT_JUDGE",
      "You are not assigned as a judge for this event.",
    );
  }
}

async function loadActiveJudgingClasses(eventId: string): Promise<AssignmentClassRow[]> {
  return prisma.eventJudgingClass.findMany({
    where: { eventId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      eventJudgingTemplateId: true,
      template: { select: { name: true, totalPoints: true } },
      eligibleCategories: { select: { eventCategoryId: true } },
    },
  });
}

async function loadClassVehicles(
  eventId: string,
  categoryIds: string[],
): Promise<SheetVehicleRow[]> {
  if (categoryIds.length === 0) return [];
  const rows = await prisma.registrationVehicle.findMany({
    where: {
      registration: { eventId },
      publicVehicleId: { not: null },
      eventCategoryId: { in: categoryIds },
    },
    select: {
      id: true,
      registrationId: true,
      publicVehicleId: true,
      eventCategoryId: true,
      vehicleNickname: true,
      vehicle: {
        select: { nickname: true, year: true, make: true, model: true },
      },
    },
    orderBy: [{ publicVehicleId: "asc" }],
  });
  return rows.map((r) => ({
    registrationVehicleId: r.id,
    registrationId: r.registrationId,
    vehicleEntryCode: r.publicVehicleId ?? "",
    eventCategoryId: r.eventCategoryId,
    nickname: r.vehicleNickname ?? r.vehicle.nickname ?? null,
    year: r.vehicle.year,
    make: r.vehicle.make,
    model: r.vehicle.model,
  }));
}

export type JudgeScoreSheetAssignmentEventSummary = {
  scoreSheetAssignmentCount: number;
  scoreSheetPendingCount: number;
};

export async function loadJudgeScoreSheetAssignmentSummary(
  judgeUserId: string,
  eventId: string,
): Promise<JudgeScoreSheetAssignmentEventSummary> {
  await assertJudgeForEvent(judgeUserId, eventId);
  const classes = await loadActiveJudgingClasses(eventId);
  if (classes.length === 0) {
    return { scoreSheetAssignmentCount: 0, scoreSheetPendingCount: 0 };
  }

  let totalAssignments = 0;
  let pendingAssignments = 0;

  for (const cls of classes) {
    const vehicles = await loadClassVehicles(
      eventId,
      cls.eligibleCategories.map((c) => c.eventCategoryId),
    );
    if (vehicles.length === 0) continue;
    totalAssignments += vehicles.length;

    const submittedCount = await prisma.judgeScoreSheet.count({
      where: {
        eventId,
        judgeUserId,
        eventJudgingClassId: cls.id,
        vehicleEntryCode: { in: vehicles.map((v) => v.vehicleEntryCode) },
        status: { in: ["SUBMITTED", "FINALIZED"] },
      },
    });
    pendingAssignments += Math.max(0, vehicles.length - submittedCount);
  }

  return {
    scoreSheetAssignmentCount: totalAssignments,
    scoreSheetPendingCount: pendingAssignments,
  };
}

export type JudgeScoreSheetClassAssignment = {
  classId: string;
  className: string;
  classDescription: string | null;
  templateName: string;
  totalPoints: number;
  vehicles: Array<{
    vehicleEntryCode: string;
    registrationId: string;
    registrationVehicleId: string;
    nickname: string | null;
    year: number;
    make: string;
    model: string;
    sheetId: string | null;
    sheetStatus: JudgeScoreSheetStatus | null;
    finalScore: number | null;
    updatedAt: string | null;
  }>;
};

export async function listJudgeScoreSheetAssignments(
  judgeUserId: string,
  eventId: string,
): Promise<JudgeScoreSheetClassAssignment[]> {
  await assertJudgeForEvent(judgeUserId, eventId);
  const classes = await loadActiveJudgingClasses(eventId);
  const out: JudgeScoreSheetClassAssignment[] = [];

  for (const cls of classes) {
    const vehicles = await loadClassVehicles(
      eventId,
      cls.eligibleCategories.map((c) => c.eventCategoryId),
    );
    if (vehicles.length === 0) continue;

    const sheets = await prisma.judgeScoreSheet.findMany({
      where: {
        eventId,
        judgeUserId,
        eventJudgingClassId: cls.id,
        vehicleEntryCode: { in: vehicles.map((v) => v.vehicleEntryCode) },
      },
      select: {
        id: true,
        vehicleEntryCode: true,
        status: true,
        finalScore: true,
        updatedAt: true,
      },
    });
    const sheetByCode = new Map(sheets.map((s) => [s.vehicleEntryCode, s]));

    out.push({
      classId: cls.id,
      className: cls.name,
      classDescription: cls.description,
      templateName: cls.template.name,
      totalPoints: cls.template.totalPoints,
      vehicles: vehicles.map((v) => {
        const sheet = sheetByCode.get(v.vehicleEntryCode);
        return {
          vehicleEntryCode: v.vehicleEntryCode,
          registrationId: v.registrationId,
          registrationVehicleId: v.registrationVehicleId,
          nickname: v.nickname,
          year: v.year,
          make: v.make,
          model: v.model,
          sheetId: sheet?.id ?? null,
          sheetStatus: sheet?.status ?? null,
          finalScore: sheet?.finalScore ?? null,
          updatedAt: sheet?.updatedAt.toISOString() ?? null,
        };
      }),
    });
  }

  return out;
}

export async function startOrResumeJudgeScoreSheet(input: {
  judgeUserId: string;
  eventId: string;
  classId: string;
  vehicleEntryCode: string;
}) {
  await assertJudgeForEvent(input.judgeUserId, input.eventId);

  const judgeClass = await prisma.eventJudgingClass.findFirst({
    where: { id: input.classId, eventId: input.eventId, isActive: true },
    include: { eligibleCategories: { select: { eventCategoryId: true } } },
  });
  if (!judgeClass) {
    throw new JudgeScoreSheetAccessError("CLASS_NOT_FOUND", "Judging class not found.");
  }

  const rv = await prisma.registrationVehicle.findFirst({
    where: {
      registration: { eventId: input.eventId },
      publicVehicleId: input.vehicleEntryCode,
    },
    select: {
      id: true,
      registrationId: true,
      eventCategoryId: true,
      publicVehicleId: true,
    },
  });
  if (!rv || !rv.publicVehicleId) {
    throw new JudgeScoreSheetAccessError(
      "VEHICLE_NOT_FOUND",
      "Vehicle entry not found for this event.",
    );
  }
  if (!rv.eventCategoryId) {
    throw new JudgeScoreSheetAccessError(
      "MISSING_CLASS",
      "This vehicle has no assigned event class. Ask organizer to map classes.",
    );
  }
  if (!judgeClass.eligibleCategories.some((c) => c.eventCategoryId === rv.eventCategoryId)) {
    throw new JudgeScoreSheetAccessError(
      "NOT_ELIGIBLE",
      "Vehicle is not eligible for this judging class.",
    );
  }

  const existing = await prisma.judgeScoreSheet.findUnique({
    where: {
      eventId_vehicleEntryCode_judgeUserId: {
        eventId: input.eventId,
        vehicleEntryCode: input.vehicleEntryCode,
        judgeUserId: input.judgeUserId,
      },
    },
    select: { id: true, eventJudgingClassId: true },
  });
  if (existing?.eventJudgingClassId && existing.eventJudgingClassId !== input.classId) {
    throw new JudgeScoreSheetAccessError(
      "CLASS_MISMATCH",
      "A score sheet for this vehicle already exists under another judging class.",
    );
  }
  if (existing) return { sheetId: existing.id };

  const created = await snapshotEventTemplateToScoreSheet({
    eventId: input.eventId,
    eventJudgingTemplateId: judgeClass.eventJudgingTemplateId,
    eventJudgingClassId: judgeClass.id,
    vehicleEntryCode: input.vehicleEntryCode,
    registrationId: rv.registrationId,
    registrationVehicleId: rv.id,
    judgeUserId: input.judgeUserId,
  });
  return { sheetId: created.id };
}

export async function getJudgeScoreSheetDetail(judgeUserId: string, eventId: string, sheetId: string) {
  await assertJudgeForEvent(judgeUserId, eventId);
  const sheet = await prisma.judgeScoreSheet.findFirst({
    where: { id: sheetId, eventId, judgeUserId },
    include: {
      sections: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
            include: {
              deductionOptions: { orderBy: { sortOrder: "asc" } },
              deductions: true,
            },
          },
        },
      },
      eventJudgingClass: { select: { id: true, name: true } },
    },
  });
  if (!sheet) {
    throw new JudgeScoreSheetAccessError("NOT_FOUND", "Score sheet not found.");
  }
  return { sheet, calculated: calculateScoreFromSnapshot(sheet) };
}
