import type { JudgingSubcategoryScoringType } from "@prisma/client";
import { computeSubcategoryImpact } from "@/lib/judging/scorecard-scoring";
import { JudgeScoreSheetAccessError } from "@/lib/judging/judge-score-sheet-judge-data";
import { resolveScorecardOptionForSelection } from "@/lib/judging/resolve-scorecard-option";

export type ScorecardItemDraftInput = {
  itemId: string;
  discretionaryPoints?: number | null;
  levelSelections?: Array<{
    optionId: string;
    violationCount?: number;
  }>;
  itemNotes?: string;
  deductionComments?: Record<string, string>;
};

export type {
  ScorecardUiDraftLike,
  ScorecardUiItemLike,
} from "@/lib/judging/scorecard-required-comment";
export { itemDraftMissingRequiredComment } from "@/lib/judging/scorecard-required-comment";

type DraftItemLike = {
  id: string;
  label: string;
  maxPoints: number;
  scoringType: JudgingSubcategoryScoringType;
  allowMultipleViolations: boolean;
  requiresCommentOnDeduction: boolean;
  deductionOptions: Array<{
    id: string;
    label: string;
    pointsDeducted: number;
  }>;
};

export function validateScorecardItemDraft(
  item: DraftItemLike,
  draft: ScorecardItemDraftInput,
  templateMethodology: "DEDUCTION" | "ADDITIVE" | "ORIGINALITY_CONDITION",
  options?: { requireComments?: boolean },
): void {
  const requireComments = options?.requireComments ?? true;
  const scoringType = item.scoringType;

  if (scoringType === "DISCRETIONARY") {
    const raw = draft.discretionaryPoints ?? 0;
    if (!Number.isFinite(raw) || raw < 0 || raw > item.maxPoints) {
      throw new JudgeScoreSheetAccessError(
        "INVALID_POINTS",
        `Deduction for "${item.label}" must be between 0 and ${item.maxPoints}.`,
      );
    }
    if (requireComments && item.requiresCommentOnDeduction && raw > 0) {
      const note = draft.itemNotes?.trim() || "";
      if (!note) {
        throw new JudgeScoreSheetAccessError(
          "REQUIRED_COMMENT",
          `A note is required when deductions are taken for "${item.label}".`,
        );
      }
    }
    return;
  }

  const selections = draft.levelSelections ?? [];
  for (const sel of selections) {
    const opt = resolveScorecardOptionForSelection(item.deductionOptions, {
      optionId: sel.optionId,
      pointsDeducted: item.deductionOptions.find((o) => o.id === sel.optionId)
        ?.pointsDeducted,
    });
    if (!opt) {
      throw new JudgeScoreSheetAccessError(
        "INVALID_OPTION",
        `Invalid selection for "${item.label}". Refresh the scorecard and try again.`,
      );
    }
    if (item.allowMultipleViolations) {
      const count = sel.violationCount ?? 1;
      if (!Number.isInteger(count) || count < 1) {
        throw new JudgeScoreSheetAccessError(
          "INVALID_DEDUCTION",
          `Violation count for "${item.label}" must be at least 1.`,
        );
      }
    }
    if (requireComments && item.requiresCommentOnDeduction) {
      const comment =
        draft.deductionComments?.[sel.optionId]?.trim() ||
        draft.itemNotes?.trim() ||
        "";
      if (!comment) {
        throw new JudgeScoreSheetAccessError(
          "REQUIRED_COMMENT",
          `A note is required for "${item.label}" when a deduction is applied.`,
        );
      }
    }
  }

  if (selections.length > 0) {
    const weights = selections.map((sel) => {
      const opt = resolveScorecardOptionForSelection(item.deductionOptions, {
        optionId: sel.optionId,
      })!;
      return {
        weight: opt.pointsDeducted,
        violationCount: item.allowMultipleViolations ? sel.violationCount ?? 1 : 1,
      };
    });
    const impact = computeSubcategoryImpact(
      {
        maxPoints: item.maxPoints,
        scoringType,
        allowMultipleViolations: item.allowMultipleViolations,
        selections: weights,
      },
      templateMethodology === "ADDITIVE" ? "ADDITIVE" : "DEDUCTION",
    );
    if (impact > item.maxPoints) {
      throw new JudgeScoreSheetAccessError(
        "INVALID_DEDUCTION",
        `Deductions for "${item.label}" exceed the maximum.`,
      );
    }
  }
}

export function validateEditableSectionItems(
  items: DraftItemLike[],
  drafts: ScorecardItemDraftInput[],
  templateMethodology: "DEDUCTION" | "ADDITIVE" | "ORIGINALITY_CONDITION",
  requireComplete: boolean,
  requireComments = true,
): void {
  const draftById = new Map(drafts.map((d) => [d.itemId, d]));

  for (const item of items) {
    const draft = draftById.get(item.id);
    if (!draft) {
      if (requireComplete) {
        throw new JudgeScoreSheetAccessError(
          "INVALID_ITEM",
          `Missing score input for "${item.label}".`,
        );
      }
      continue;
    }
    validateScorecardItemDraft(item, draft, templateMethodology, { requireComments });
  }
}
