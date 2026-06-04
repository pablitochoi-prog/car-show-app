import type { EventJudgeCategoryAssignmentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calculateScorecardFromSheet } from "@/lib/judging/build-scorecard-from-sheet";
import { ensureSheetRegistrationVehicleId } from "@/lib/judging/judge-assigned-scorecard-data";
import {
  buildAssignmentLookups,
  findAssignmentsForScoreSheet,
  isSheetSectionSavable,
  resolveSheetSectionAssignment,
} from "@/lib/judging/judge-scorecard-section-assignment";
import {
  assertJudgeForEvent,
  JudgeScoreSheetAccessError,
} from "@/lib/judging/judge-score-sheet-judge-data";

export type ScorecardSaveSection = {
  id: string;
  name: string;
  eventJudgingSectionId: string | null;
  items: Array<{
    id: string;
    label: string;
    maxPoints: number;
    scoringType: string;
    allowMultipleViolations: boolean;
    requiresCommentOnDeduction: boolean;
    deductionOptions: Array<{
      id: string;
      label: string;
      pointsDeducted: number;
    }>;
  }>;
};

export type ScorecardSaveContext = {
  sheetId: string;
  eventId: string;
  judgeUserId: string;
  methodology: "DEDUCTION" | "ADDITIVE" | "ORIGINALITY_CONDITION";
  totalPoints: number;
  registrationVehicleId: string;
  vehicleEntryCode: string;
  sections: ScorecardSaveSection[];
};

/** Lightweight sheet load for PATCH/POST — avoids heavy vehicle/assignment UI payload. */
export async function loadScorecardSaveContext(
  judgeUserId: string,
  eventId: string,
  sheetId: string,
): Promise<ScorecardSaveContext> {
  await assertJudgeForEvent(judgeUserId, eventId);

  const sheet = await prisma.judgeScoreSheet.findFirst({
    where: { id: sheetId, eventId, judgeUserId },
    select: {
      id: true,
      status: true,
      methodology: true,
      totalPoints: true,
      vehicleEntryCode: true,
      registrationVehicleId: true,
    },
  });

  if (!sheet) {
    throw new JudgeScoreSheetAccessError("NOT_FOUND", "Score sheet not found.");
  }
  if (sheet.status !== "DRAFT") {
    throw new JudgeScoreSheetAccessError(
      "READ_ONLY",
      "Submitted score sheets are read-only.",
    );
  }

  const registrationVehicleId = await ensureSheetRegistrationVehicleId(
    sheetId,
    eventId,
    sheet.vehicleEntryCode,
    sheet.registrationVehicleId,
  );
  if (!registrationVehicleId) {
    throw new JudgeScoreSheetAccessError("VEHICLE_NOT_FOUND", "Vehicle not linked.");
  }

  const sections = await prisma.judgeScoreSheetSection.findMany({
    where: { scoreSheetId: sheetId, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      eventJudgingSectionId: true,
      items: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          label: true,
          maxPoints: true,
          scoringType: true,
          allowMultipleViolations: true,
          requiresCommentOnDeduction: true,
          deductionOptions: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, label: true, pointsDeducted: true },
          },
        },
      },
    },
  });

  return {
    sheetId,
    eventId,
    judgeUserId,
    methodology: sheet.methodology,
    totalPoints: sheet.totalPoints,
    registrationVehicleId,
    vehicleEntryCode: sheet.vehicleEntryCode,
    sections,
  };
}

export async function assertSavableSectionIds(
  ctx: ScorecardSaveContext,
  sectionIds: string[],
): Promise<ScorecardSaveSection[]> {
  const idSet = new Set(sectionIds);
  const targets = ctx.sections.filter((s) => idSet.has(s.id));
  if (targets.length !== sectionIds.length) {
    throw new JudgeScoreSheetAccessError("NOT_FOUND", "Category not found on score sheet.");
  }

  const assignments = await findAssignmentsForScoreSheet({
    sheetId: ctx.sheetId,
    eventId: ctx.eventId,
    judgeUserId: ctx.judgeUserId,
    registrationVehicleId: ctx.registrationVehicleId,
    vehicleEntryCode: ctx.vehicleEntryCode,
  });

  const lookups = buildAssignmentLookups(
    assignments.map((a) => ({
      eventJudgingSectionId: a.eventJudgingSectionId,
      status: a.status,
      sectionName: a.section.name,
    })),
  );

  const savable = targets.filter((s) =>
    isSheetSectionSavable(
      { eventJudgingSectionId: s.eventJudgingSectionId, name: s.name },
      lookups,
    ),
  );

  if (savable.length !== sectionIds.length) {
    throw new JudgeScoreSheetAccessError(
      "READ_ONLY",
      "One or more categories are not assigned to you or are already submitted.",
    );
  }

  return savable;
}

export async function recalculateAndStoreSheetScore(sheetId: string): Promise<void> {
  const sheetRow = await prisma.judgeScoreSheet.findUnique({
    where: { id: sheetId },
    select: {
      methodology: true,
      totalPoints: true,
      sections: {
        where: { isActive: true },
        select: {
          weightPercent: true,
          maxSectionPoints: true,
          items: {
            where: { isActive: true },
            select: {
              maxPoints: true,
              pointType: true,
              scoringType: true,
              allowMultipleViolations: true,
              awardedPoints: true,
              deductionOptions: true,
              deductions: true,
            },
          },
        },
      },
    },
  });

  if (!sheetRow) return;

  const calculated = calculateScorecardFromSheet({
    methodology: sheetRow.methodology,
    totalPoints: sheetRow.totalPoints,
    sections: sheetRow.sections.map((section) => ({
      weightPercent: section.weightPercent,
      maxSectionPoints: section.maxSectionPoints,
      items: section.items.map((item) => ({
        maxPoints: item.maxPoints,
        pointType: item.pointType,
        scoringType: item.scoringType,
        allowMultipleViolations: item.allowMultipleViolations,
        awardedPoints: item.awardedPoints,
        deductionOptions: item.deductionOptions,
        deductions: item.deductions,
      })),
    })),
  });

  await prisma.judgeScoreSheet.update({
    where: { id: sheetId },
    data: {
      finalScore: calculated.finalScore,
      originalityDeductions: calculated.originalityDeductions,
      conditionDeductions: calculated.conditionDeductions,
    },
  });
}

export async function updateAssignmentStatusesForSheet(input: {
  sheetId: string;
  eventId: string;
  judgeUserId: string;
  registrationVehicleId: string;
  vehicleEntryCode: string;
  sheetSections: Array<{
    id: string;
    name: string;
    eventJudgingSectionId: string | null;
  }>;
  sheetSectionIds: string[];
  status: EventJudgeCategoryAssignmentStatus;
}): Promise<number> {
  const targets = input.sheetSections.filter((s) =>
    input.sheetSectionIds.includes(s.id),
  );
  if (targets.length === 0) return 0;

  const assignments = await findAssignmentsForScoreSheet({
    sheetId: input.sheetId,
    eventId: input.eventId,
    judgeUserId: input.judgeUserId,
    registrationVehicleId: input.registrationVehicleId,
    vehicleEntryCode: input.vehicleEntryCode,
  });

  const lookups = buildAssignmentLookups(
    assignments.map((a) => ({
      eventJudgingSectionId: a.eventJudgingSectionId,
      status: a.status,
      sectionName: a.section.name,
    })),
  );

  const assignmentIds: string[] = [];
  for (const sheetSection of targets) {
    if (
      !isSheetSectionSavable(
        {
          eventJudgingSectionId: sheetSection.eventJudgingSectionId,
          name: sheetSection.name,
        },
        lookups,
      )
    ) {
      continue;
    }
    const resolved = resolveSheetSectionAssignment(
      {
        eventJudgingSectionId: sheetSection.eventJudgingSectionId,
        name: sheetSection.name,
      },
      lookups,
    );
    const eventSectionId = resolved.resolvedEventJudgingSectionId;
    if (!eventSectionId) continue;
    const row = assignments.find(
      (a) =>
        a.eventJudgingSectionId === eventSectionId && a.status !== "SUBMITTED",
    );
    if (row) assignmentIds.push(row.id);
  }

  const uniqueAssignmentIds = [...new Set(assignmentIds)];
  if (uniqueAssignmentIds.length === 0) return 0;

  await prisma.eventJudgeCategoryAssignment.updateMany({
    where: { id: { in: uniqueAssignmentIds } },
    data: {
      status: input.status,
      judgeScoreSheetId: input.sheetId,
    },
  });

  return uniqueAssignmentIds.length;
}
