import type { JudgingDeductionBucket } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calculateScorecardFromSheet } from "@/lib/judging/build-scorecard-from-sheet";
import {
  loadJudgeAssignedScorecardDetail,
  type JudgeAssignedScorecardDetail,
} from "@/lib/judging/judge-assigned-scorecard-data";
import {
  validateEditableSectionItems,
  type ScorecardItemDraftInput,
} from "@/lib/judging/judge-assigned-scorecard-validation";
import { JudgeScoreSheetAccessError } from "@/lib/judging/judge-score-sheet-judge-data";

export type SaveAssignedScorecardInput = {
  judgeUserId: string;
  eventId: string;
  sheetId: string;
  generalNotes?: string;
  sectionIds: string[];
  items: ScorecardItemDraftInput[];
};

function editableItemsForSections(
  detail: JudgeAssignedScorecardDetail,
  sectionIds: string[],
) {
  const idSet = new Set(sectionIds);
  const sections = detail.sections.filter(
    (s) => idSet.has(s.id) && s.isEditable,
  );
  if (sections.length !== sectionIds.length) {
    throw new JudgeScoreSheetAccessError(
      "READ_ONLY",
      "One or more categories are not assigned or are read-only.",
    );
  }
  return sections.flatMap((s) => s.items);
}

async function persistScorecardItems(
  sheetId: string,
  items: ScorecardItemDraftInput[],
  itemMeta: Map<
    string,
    {
      scoringType: string;
      label: string;
      deductionOptions: Array<{ id: string; label: string; pointsDeducted: number }>;
    }
  >,
) {
  const updateByItem = new Map(items.map((i) => [i.itemId, i]));

  await prisma.$transaction(async (tx) => {
    for (const [itemId, draft] of updateByItem) {
      const meta = itemMeta.get(itemId);
      if (!meta) continue;

      await tx.judgeScoreSheetItem.update({
        where: { id: itemId },
        data: { itemNotes: draft.itemNotes?.trim() || null },
      });
      await tx.judgeScoreSheetDeduction.deleteMany({ where: { itemId } });

      if (meta.scoringType === "DISCRETIONARY") {
        const pts = Math.round(draft.discretionaryPoints ?? 0);
        if (pts > 0) {
          await tx.judgeScoreSheetDeduction.create({
            data: {
              itemId,
              label: "Deduction",
              pointsDeducted: pts,
              discretionaryPoints: pts,
              violationCount: 1,
            },
          });
        }
        continue;
      }

      for (const sel of draft.levelSelections ?? []) {
        const opt = meta.deductionOptions.find((o) => o.id === sel.optionId);
        if (!opt) continue;
        const violationCount = Math.max(1, sel.violationCount ?? 1);
        await tx.judgeScoreSheetDeduction.create({
          data: {
            itemId,
            optionId: opt.id,
            label: opt.label,
            pointsDeducted: opt.pointsDeducted,
            violationCount,
            comment: draft.deductionComments?.[sel.optionId]?.trim() || null,
            deductionBucket: null as JudgingDeductionBucket | null,
          },
        });
      }
    }
  });
}

function buildItemMetaMap(detail: JudgeAssignedScorecardDetail) {
  const map = new Map<
    string,
    {
      scoringType: string;
      label: string;
      maxPoints: number;
      allowMultipleViolations: boolean;
      requiresCommentOnDeduction: boolean;
      deductionOptions: Array<{ id: string; label: string; pointsDeducted: number }>;
    }
  >();
  for (const section of detail.sections) {
    for (const item of section.items) {
      map.set(item.id, {
        scoringType: item.scoringType,
        label: item.label,
        maxPoints: item.maxPoints,
        allowMultipleViolations: item.allowMultipleViolations,
        requiresCommentOnDeduction: item.requiresCommentOnDeduction,
        deductionOptions: item.deductionOptions,
      });
    }
  }
  return map;
}

export async function saveAssignedScorecardDraft(
  input: SaveAssignedScorecardInput,
) {
  const detail = await loadJudgeAssignedScorecardDetail(
    input.judgeUserId,
    input.eventId,
    input.sheetId,
  );
  if (detail.sheet.status !== "DRAFT") {
    throw new JudgeScoreSheetAccessError(
      "READ_ONLY",
      "Submitted score sheets are read-only.",
    );
  }

  const editableItems = editableItemsForSections(detail, input.sectionIds);
  const itemMeta = buildItemMetaMap(detail);

  validateEditableSectionItems(
    editableItems.map((i) => ({
      id: i.id,
      label: i.label,
      maxPoints: i.maxPoints,
      scoringType: i.scoringType as "DISCRETIONARY" | "LEVELS" | "FULL",
      allowMultipleViolations: i.allowMultipleViolations,
      requiresCommentOnDeduction: i.requiresCommentOnDeduction,
      deductionOptions: i.deductionOptions,
    })),
    input.items.filter((row) => editableItems.some((i) => i.id === row.itemId)),
    detail.sheet.methodology,
    false,
  );

  await prisma.judgeScoreSheet.update({
    where: { id: input.sheetId },
    data: { generalNotes: input.generalNotes?.trim() || null },
  });

  await persistScorecardItems(input.sheetId, input.items, itemMeta);

  const sectionKeys = detail.sections
    .filter((s) => input.sectionIds.includes(s.id) && s.eventJudgingSectionId)
    .map((s) => s.eventJudgingSectionId!);

  const sheetMeta = await prisma.judgeScoreSheet.findUnique({
    where: { id: input.sheetId },
    select: { registrationVehicleId: true },
  });

  if (sectionKeys.length > 0 && sheetMeta?.registrationVehicleId) {
    await prisma.eventJudgeCategoryAssignment.updateMany({
      where: {
        eventId: input.eventId,
        judgeUserId: input.judgeUserId,
        registrationVehicleId: sheetMeta.registrationVehicleId,
        eventJudgingSectionId: { in: sectionKeys },
      },
      data: { status: "SAVED_FOR_LATER" },
    });
  }

  const refreshed = await loadJudgeAssignedScorecardDetail(
    input.judgeUserId,
    input.eventId,
    input.sheetId,
  );

  const sheetRow = await prisma.judgeScoreSheet.findUnique({
    where: { id: input.sheetId },
    include: {
      sections: {
        include: {
          items: {
            include: { deductionOptions: true, deductions: true },
          },
        },
      },
    },
  });
  if (sheetRow) {
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
      where: { id: input.sheetId },
      data: {
        finalScore: calculated.finalScore,
        originalityDeductions: calculated.originalityDeductions,
        conditionDeductions: calculated.conditionDeductions,
      },
    });
    return { detail: refreshed, calculated };
  }

  return { detail: refreshed, calculated: refreshed.calculated };
}

export async function submitAssignedScorecard(input: {
  judgeUserId: string;
  eventId: string;
  sheetId: string;
  generalNotes?: string;
  items: ScorecardItemDraftInput[];
}) {
  const detail = await loadJudgeAssignedScorecardDetail(
    input.judgeUserId,
    input.eventId,
    input.sheetId,
  );
  if (detail.sheet.status !== "DRAFT") {
    throw new JudgeScoreSheetAccessError(
      "READ_ONLY",
      "Score sheet is already submitted.",
    );
  }

  const editableSections = detail.sections.filter((s) => s.isEditable);
  const sectionIds = editableSections.map((s) => s.id);

  const editableItems = editableSections.flatMap((s) => s.items);
  const itemMeta = buildItemMetaMap(detail);

  validateEditableSectionItems(
    editableItems.map((i) => ({
      id: i.id,
      label: i.label,
      maxPoints: i.maxPoints,
      scoringType: i.scoringType as "DISCRETIONARY" | "LEVELS" | "FULL",
      allowMultipleViolations: i.allowMultipleViolations,
      requiresCommentOnDeduction: i.requiresCommentOnDeduction,
      deductionOptions: i.deductionOptions,
    })),
    input.items.filter((row) => editableItems.some((i) => i.id === row.itemId)),
    detail.sheet.methodology,
    false,
  );

  await saveAssignedScorecardDraft({
    ...input,
    sectionIds,
  });

  const sectionKeys = editableSections
    .filter((s) => s.eventJudgingSectionId)
    .map((s) => s.eventJudgingSectionId!);

  const sheetMeta = await prisma.judgeScoreSheet.findUnique({
    where: { id: input.sheetId },
    select: { registrationVehicleId: true },
  });

  await prisma.$transaction(async (tx) => {
    if (sectionKeys.length > 0 && sheetMeta?.registrationVehicleId) {
      await tx.eventJudgeCategoryAssignment.updateMany({
        where: {
          eventId: input.eventId,
          judgeUserId: input.judgeUserId,
          registrationVehicleId: sheetMeta.registrationVehicleId,
          eventJudgingSectionId: { in: sectionKeys },
        },
        data: { status: "SUBMITTED" },
      });
    }
    await tx.judgeScoreSheet.update({
      where: { id: input.sheetId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        finalizedAt: new Date(),
      },
    });
  });

  const refreshed = await loadJudgeAssignedScorecardDetail(
    input.judgeUserId,
    input.eventId,
    input.sheetId,
  );
  return refreshed;
}
