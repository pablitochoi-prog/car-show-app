import type {
  JudgingDeductionBucket,
  JudgingMethodology,
  JudgingSubcategoryPointType,
  JudgingSubcategoryScoringType,
} from "@prisma/client";
import {
  calculateScorecardSheetScore,
  type ScorecardCategoryScoreInput,
  type ScorecardSheetScoreInput,
  type ScorecardSubcategoryScoreInput,
} from "@/lib/judging/scorecard-scoring";

export type ScorecardSheetSnapshotLike = {
  methodology: JudgingMethodology;
  totalPoints: number;
  sections: Array<{
    weightPercent: number | null;
    maxSectionPoints: number | null;
    items: Array<{
      maxPoints: number;
      pointType: JudgingSubcategoryPointType | null;
      scoringType: JudgingSubcategoryScoringType;
      allowMultipleViolations: boolean;
      awardedPoints: number | null;
      deductionOptions: Array<{
        id: string;
        pointsDeducted: number;
        deductionBucket: JudgingDeductionBucket | null;
      }>;
      deductions: Array<{
        optionId: string | null;
        pointsDeducted: number;
        violationCount: number;
        discretionaryPoints: number | null;
        deductionBucket: JudgingDeductionBucket | null;
      }>;
    }>;
  }>;
};

function mapItemToSubcategoryInput(
  item: ScorecardSheetSnapshotLike["sections"][0]["items"][0],
): ScorecardSubcategoryScoreInput {
  const scoringType = item.scoringType;

  if (scoringType === "DISCRETIONARY") {
    const disc = item.deductions.find((d) => d.discretionaryPoints != null);
    return {
      maxPoints: item.maxPoints,
      scoringType,
      pointType: item.pointType,
      discretionaryPoints: disc?.discretionaryPoints ?? 0,
    };
  }

  if (item.deductions.length > 0) {
    const selections = item.deductions.map((d) => {
      const opt = d.optionId
        ? item.deductionOptions.find((o) => o.id === d.optionId)
        : null;
      return {
        weight: opt?.pointsDeducted ?? d.pointsDeducted,
        violationCount: d.violationCount,
      };
    });
    return {
      maxPoints: item.maxPoints,
      scoringType,
      pointType: item.pointType,
      allowMultipleViolations: item.allowMultipleViolations,
      selections,
    };
  }

  if (item.awardedPoints != null && item.scoringType !== "LEVELS") {
    return {
      maxPoints: item.maxPoints,
      scoringType,
      pointType: item.pointType,
      awardedPoints: item.awardedPoints,
    };
  }

  const legacy = item.deductions.map((d) => ({
    pointsDeducted: d.pointsDeducted,
    deductionBucket: d.deductionBucket,
    violationCount: d.violationCount,
  }));

  return {
    maxPoints: item.maxPoints,
    scoringType,
    pointType: item.pointType,
    allowMultipleViolations: item.allowMultipleViolations,
    legacyDeductions: legacy,
  };
}

export function buildScorecardInputFromSheet(
  sheet: ScorecardSheetSnapshotLike,
): ScorecardSheetScoreInput {
  const categories: ScorecardCategoryScoreInput[] = sheet.sections.map((section) => ({
    maxSectionPoints: section.maxSectionPoints,
    weightPercent: section.weightPercent,
    subcategories: section.items
      .filter((item) => item.scoringType !== undefined)
      .map((item) => mapItemToSubcategoryInput(item)),
  }));

  return {
    methodology: sheet.methodology,
    totalPoints: sheet.totalPoints,
    categories,
  };
}

export function calculateScorecardFromSheet(sheet: ScorecardSheetSnapshotLike) {
  return calculateScorecardSheetScore(buildScorecardInputFromSheet(sheet));
}
