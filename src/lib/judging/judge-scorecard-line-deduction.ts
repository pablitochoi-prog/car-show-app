import type { JudgingMethodology } from "@prisma/client";
import {
  computeCategoryScore,
  computeSubcategoryImpact,
  type ScorecardSubcategoryScoreInput,
} from "@/lib/judging/scorecard-scoring";

type ScorecardItemRowData = {
  maxPoints: number;
  scoringType: string;
  allowMultipleViolations: boolean;
  deductionOptions: Array<{ id: string; label: string; pointsDeducted: number }>;
};

type ScorecardItemDraft = {
  discretionaryPoints: string;
  selectedOptionIds: string[];
  violationCounts: Record<string, string>;
};

/** Full-word label for pre-defined level buttons on the judge scorecard. */
export function levelButtonLabel(label: string): string {
  const lower = label.trim().toLowerCase();
  if (lower === "minor" || lower.startsWith("minor")) return "Minimum";
  if (lower === "major" || lower.startsWith("major")) return "Major";
  if (lower === "critical" || lower.startsWith("critical")) return "Critical";
  return label.trim();
}

export function draftToSubcategoryScoreInput(
  item: ScorecardItemRowData,
  draft: ScorecardItemDraft,
): ScorecardSubcategoryScoreInput {
  if (item.scoringType === "DISCRETIONARY") {
    const raw = draft.discretionaryPoints.trim();
    const pts = raw === "" ? 0 : Number(raw);
    return {
      maxPoints: item.maxPoints,
      scoringType: "DISCRETIONARY",
      discretionaryPoints: Number.isFinite(pts) ? pts : 0,
    };
  }

  const selections = draft.selectedOptionIds
    .map((optionId) => {
      const opt = item.deductionOptions.find((o) => o.id === optionId);
      if (!opt) return null;
      const countRaw = draft.violationCounts[optionId];
      const violationCount =
        item.allowMultipleViolations && countRaw
          ? Math.max(1, Math.round(Number(countRaw)) || 1)
          : 1;
      return { weight: opt.pointsDeducted, violationCount };
    })
    .filter((s): s is { weight: number; violationCount: number } => s != null);

  return {
    maxPoints: item.maxPoints,
    scoringType:
      item.scoringType === "FULL"
        ? "FULL"
        : item.scoringType === "DISCRETIONARY"
          ? "DISCRETIONARY"
          : "LEVELS",
    allowMultipleViolations: item.allowMultipleViolations,
    selections,
  };
}

/** Live deduction total for one scorecard line (matches server scoring). */
export function computeItemLineDeduction(
  item: ScorecardItemRowData,
  draft: ScorecardItemDraft,
  methodology: JudgingMethodology,
): number {
  return computeSubcategoryImpact(
    draftToSubcategoryScoreInput(item, draft),
    methodology,
  );
}

export type SectionDeductionSummary = {
  totalDeductions: number;
  sectionMax: number;
  sectionScore: number;
};

/** Category-level deductions and score from current drafts (matches server scoring). */
export function computeSectionDeductionSummary(
  items: Array<{ id: string } & ScorecardItemRowData>,
  drafts: Record<string, ScorecardItemDraft>,
  methodology: JudgingMethodology,
  maxSectionPoints: number | null,
): SectionDeductionSummary {
  const subcategories = items
    .map((item) => {
      const draft = drafts[item.id];
      if (!draft) return null;
      return draftToSubcategoryScoreInput(item, draft);
    })
    .filter((s): s is ScorecardSubcategoryScoreInput => s != null);

  const sectionMax =
    maxSectionPoints ?? items.reduce((sum, item) => sum + item.maxPoints, 0);

  const totalDeductions = subcategories.reduce(
    (sum, sub) => sum + computeSubcategoryImpact(sub, methodology),
    0,
  );

  const sectionScore = computeCategoryScore(
    { maxSectionPoints: sectionMax, subcategories },
    methodology,
  );

  return { totalDeductions, sectionMax, sectionScore };
}
