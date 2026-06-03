import type { JudgingSubcategoryScoringType } from "@prisma/client";
import { computeSubcategoryImpact } from "@/lib/judging/scorecard-scoring";
import { JudgeScoreSheetAccessError } from "@/lib/judging/judge-score-sheet-judge-data";

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

type DraftItemLike = {
  id: string;
  label: string;
  maxPoints: number;
  scoringType: JudgingSubcategoryScoringType;
  allowMultipleViolations: boolean;
  requiresCommentOnDeduction: boolean;
  deductionOptions: Array<{
    id: string;
    pointsDeducted: number;
  }>;
};

export function validateScorecardItemDraft(
  item: DraftItemLike,
  draft: ScorecardItemDraftInput,
  templateMethodology: "DEDUCTION" | "ADDITIVE" | "ORIGINALITY_CONDITION",
): void {
  const scoringType = item.scoringType;

  if (scoringType === "DISCRETIONARY") {
    const raw = draft.discretionaryPoints ?? 0;
    if (!Number.isFinite(raw) || raw < 0 || raw > item.maxPoints) {
      throw new JudgeScoreSheetAccessError(
        "INVALID_POINTS",
        `Deduction for "${item.label}" must be between 0 and ${item.maxPoints}.`,
      );
    }
    if (item.requiresCommentOnDeduction && raw > 0) {
      const note = draft.itemNotes?.trim() || "";
      if (!note) {
        throw new JudgeScoreSheetAccessError(
          "REQUIRED_COMMENT",
          `Remarks are required when deductions are taken for "${item.label}".`,
        );
      }
    }
    return;
  }

  const selections = draft.levelSelections ?? [];
  const optionSet = new Set(item.deductionOptions.map((o) => o.id));
  for (const sel of selections) {
    if (!optionSet.has(sel.optionId)) {
      throw new JudgeScoreSheetAccessError(
        "INVALID_OPTION",
        `Invalid selection for "${item.label}".`,
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
    if (item.requiresCommentOnDeduction) {
      const comment = draft.deductionComments?.[sel.optionId]?.trim() || "";
      if (!comment) {
        throw new JudgeScoreSheetAccessError(
          "REQUIRED_COMMENT",
          `Deduction comment is required for "${item.label}".`,
        );
      }
    }
  }

  if (selections.length > 0) {
    const weights = selections.map((sel) => {
      const opt = item.deductionOptions.find((o) => o.id === sel.optionId)!;
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
    validateScorecardItemDraft(item, draft, templateMethodology);
  }
}
