import type { JudgingDeductionBucket } from "@prisma/client";
import type { JudgeScoreSheetItemDraftInput } from "@/lib/judging/judge-score-sheet-mutations";
import { JudgeScoreSheetAccessError } from "@/lib/judging/judge-score-sheet-judge-data";

export const DEDUCTION_COMMENT_REQUIRED_MESSAGE = "Deduction comment is required.";

type DraftItemLike = {
  id: string;
  label: string;
  maxPoints: number;
  requiresCommentOnDeduction: boolean;
  deductionOptions: Array<{
    id: string;
    label: string;
    pointsDeducted: number;
    deductionBucket?: JudgingDeductionBucket | null;
  }>;
};

type DraftSheetLike = {
  sections: Array<{ items: DraftItemLike[] }>;
};

function buildItemMap(sheet: DraftSheetLike) {
  return new Map(
    sheet.sections.flatMap((section) =>
      section.items.map((item) => [item.id, item] as const),
    ),
  );
}

/** Validate draft item updates before persisting (used by API + client). */
export function validateJudgeScoreSheetDraftItems(
  sheet: DraftSheetLike,
  items: JudgeScoreSheetItemDraftInput[],
): void {
  const itemMap = buildItemMap(sheet);
  const updateByItemId = new Map<string, JudgeScoreSheetItemDraftInput>();

  for (const itemUpdate of items) {
    if (!itemMap.has(itemUpdate.itemId)) {
      throw new JudgeScoreSheetAccessError(
        "INVALID_ITEM",
        "One or more score sheet items are invalid.",
      );
    }
    updateByItemId.set(itemUpdate.itemId, itemUpdate);
  }

  for (const [itemId, item] of itemMap.entries()) {
    const itemUpdate = updateByItemId.get(itemId);
    if (!itemUpdate) continue;

    if (
      itemUpdate.awardedPoints != null &&
      (!Number.isFinite(itemUpdate.awardedPoints) ||
        itemUpdate.awardedPoints < 0 ||
        itemUpdate.awardedPoints > item.maxPoints)
    ) {
      throw new JudgeScoreSheetAccessError(
        "INVALID_POINTS",
        `Awarded points for "${item.label}" must be between 0 and ${item.maxPoints}.`,
      );
    }

    const optionIds = itemUpdate.deductionOptionIds ?? [];
    const optionSet = new Set(item.deductionOptions.map((opt) => opt.id));
    if (optionIds.some((id) => !optionSet.has(id))) {
      throw new JudgeScoreSheetAccessError(
        "INVALID_OPTION",
        `One or more deductions for "${item.label}" are invalid.`,
      );
    }

    const deductionComments = itemUpdate.deductionComments ?? {};
    let totalDeducted = 0;
    for (const optionId of optionIds) {
      const option = item.deductionOptions.find((d) => d.id === optionId)!;
      const comment = deductionComments[optionId]?.trim() || "";
      if (item.requiresCommentOnDeduction && !comment) {
        throw new JudgeScoreSheetAccessError(
          "REQUIRED_COMMENT",
          `Deduction comment is required for "${item.label}".`,
        );
      }
      totalDeducted += option.pointsDeducted;
    }

    if (totalDeducted > item.maxPoints) {
      throw new JudgeScoreSheetAccessError(
        "INVALID_DEDUCTION",
        `Deductions for "${item.label}" exceed max points.`,
      );
    }
  }
}

/** Client-side field errors keyed by itemId then deduction optionId. */
export function collectDeductionCommentFieldErrors(
  sheet: DraftSheetLike,
  items: JudgeScoreSheetItemDraftInput[],
): Record<string, Record<string, string>> {
  const itemMap = buildItemMap(sheet);
  const updateByItemId = new Map(items.map((row) => [row.itemId, row] as const));
  const out: Record<string, Record<string, string>> = {};

  for (const [itemId, item] of itemMap.entries()) {
    if (!item.requiresCommentOnDeduction) continue;
    const itemUpdate = updateByItemId.get(itemId);
    if (!itemUpdate) continue;
    const comments = itemUpdate.deductionComments ?? {};
    for (const optionId of itemUpdate.deductionOptionIds ?? []) {
      if (comments[optionId]?.trim()) continue;
      out[itemId] ??= {};
      out[itemId][optionId] = DEDUCTION_COMMENT_REQUIRED_MESSAGE;
    }
  }

  return out;
}
