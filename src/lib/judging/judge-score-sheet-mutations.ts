import type { JudgingDeductionBucket } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calculateScoreFromSnapshot } from "@/lib/judging/calculate-score-from-snapshot";
import {
  getJudgeScoreSheetDetail,
  JudgeScoreSheetAccessError,
} from "@/lib/judging/judge-score-sheet-judge-data";
import { validateJudgeScoreSheetDraftItems } from "@/lib/judging/judge-score-sheet-draft-validation";

export type JudgeScoreSheetItemDraftInput = {
  itemId: string;
  awardedPoints?: number | null;
  itemNotes?: string;
  deductionOptionIds?: string[];
  deductionComments?: Record<string, string>;
};

export async function saveJudgeScoreSheetDraft(input: {
  judgeUserId: string;
  eventId: string;
  sheetId: string;
  generalNotes?: string;
  items: JudgeScoreSheetItemDraftInput[];
}) {
  const detail = await getJudgeScoreSheetDetail(
    input.judgeUserId,
    input.eventId,
    input.sheetId,
  );
  const sheet = detail.sheet;
  if (sheet.status !== "DRAFT") {
    throw new JudgeScoreSheetAccessError(
      "READ_ONLY",
      "Submitted/finalized score sheets are read-only.",
    );
  }

  validateJudgeScoreSheetDraftItems(sheet, input.items);

  const itemMap = new Map(
    sheet.sections.flatMap((section) =>
      section.items.map((item) => [item.id, item] as const),
    ),
  );
  const updateByItemId = new Map(input.items.map((row) => [row.itemId, row] as const));

  await prisma.$transaction(async (tx) => {
    await tx.judgeScoreSheet.update({
      where: { id: sheet.id },
      data: {
        generalNotes: input.generalNotes?.trim() || null,
      },
    });

    for (const [itemId, item] of itemMap.entries()) {
      const itemUpdate = updateByItemId.get(itemId);
      if (!itemUpdate) continue;

      const optionIds = itemUpdate.deductionOptionIds ?? [];
      const deductionComments = itemUpdate.deductionComments ?? {};
      const deductionsToCreate = optionIds.map((optionId) => {
        const option = item.deductionOptions.find((d) => d.id === optionId)!;
        return {
          itemId,
          optionId: option.id,
          label: option.label,
          pointsDeducted: option.pointsDeducted,
          deductionBucket: option.deductionBucket as JudgingDeductionBucket | null,
          comment: deductionComments[optionId]?.trim() || null,
        };
      });

      await tx.judgeScoreSheetItem.update({
        where: { id: itemId },
        data: {
          awardedPoints: itemUpdate.awardedPoints ?? null,
          itemNotes: itemUpdate.itemNotes?.trim() || null,
        },
      });
      await tx.judgeScoreSheetDeduction.deleteMany({ where: { itemId } });
      if (deductionsToCreate.length > 0) {
        await tx.judgeScoreSheetDeduction.createMany({ data: deductionsToCreate });
      }
    }
  });

  const updated = await getJudgeScoreSheetDetail(
    input.judgeUserId,
    input.eventId,
    input.sheetId,
  );
  await prisma.judgeScoreSheet.update({
    where: { id: updated.sheet.id },
    data: {
      finalScore: updated.calculated.finalScore,
      originalityDeductions: updated.calculated.originalityDeductions,
      conditionDeductions: updated.calculated.conditionDeductions,
    },
  });

  return updated.calculated;
}

export async function submitJudgeScoreSheet(input: {
  judgeUserId: string;
  eventId: string;
  sheetId: string;
}) {
  const detail = await getJudgeScoreSheetDetail(
    input.judgeUserId,
    input.eventId,
    input.sheetId,
  );
  if (detail.sheet.status !== "DRAFT") {
    throw new JudgeScoreSheetAccessError(
      "READ_ONLY",
      "Score sheet is already submitted/finalized.",
    );
  }

  for (const section of detail.sheet.sections) {
    for (const item of section.items) {
      if (!item.requiresCommentOnDeduction) continue;
      for (const deduction of item.deductions) {
        if (!deduction.comment?.trim()) {
          throw new JudgeScoreSheetAccessError(
            "REQUIRED_COMMENT",
            `Deduction comment is required for "${item.label}".`,
          );
        }
      }
    }
  }

  const calculated = calculateScoreFromSnapshot(detail.sheet);
  await prisma.judgeScoreSheet.update({
    where: { id: detail.sheet.id },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      finalizedAt: new Date(),
      finalScore: calculated.finalScore,
      originalityDeductions: calculated.originalityDeductions,
      conditionDeductions: calculated.conditionDeductions,
    },
  });
  return calculated;
}
