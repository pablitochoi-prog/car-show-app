import type {
  JudgingDeductionBucket,
  JudgingMethodology,
} from "@prisma/client";
import { calculateScorecardFromSheet } from "@/lib/judging/build-scorecard-from-sheet";
import {
  calculateScoreSheetScore,
  type CalculateScoreInput,
  type ScoreSheetItemInput,
} from "@/lib/judging/calculate-score";

export type SnapshotScoreSheetItemLike = {
  maxPoints: number;
  awardedPoints: number | null;
  pointType?: import("@prisma/client").JudgingSubcategoryPointType | null;
  scoringType?: import("@prisma/client").JudgingSubcategoryScoringType | null;
  allowMultipleViolations?: boolean;
  deductionOptions?: Array<{
    id: string;
    pointsDeducted: number;
    deductionBucket: JudgingDeductionBucket | null;
  }>;
  deductions: Array<{
    optionId?: string | null;
    pointsDeducted: number;
    violationCount?: number;
    discretionaryPoints?: number | null;
    deductionBucket: JudgingDeductionBucket | null;
  }>;
};

export type SnapshotScoreSheetLike = {
  methodology: JudgingMethodology;
  totalPoints: number;
  sections: Array<{
    weightPercent: number | null;
    maxSectionPoints: number | null;
    items: Array<SnapshotScoreSheetItemLike>;
  }>;
};

/** Map a persisted score sheet snapshot to calculate-score input. */
export function buildCalculateInputFromSnapshot(
  sheet: SnapshotScoreSheetLike,
): CalculateScoreInput {
  return {
    methodology: sheet.methodology,
    totalPoints: sheet.totalPoints,
    sections: sheet.sections.map((section) => ({
      weightPercent: section.weightPercent,
      maxSectionPoints: section.maxSectionPoints,
      items: section.items.map(
        (item): ScoreSheetItemInput => ({
          maxPoints: item.maxPoints,
          awardedPoints: item.awardedPoints,
          deductions: item.deductions.map((d) => ({
            pointsDeducted: d.pointsDeducted,
            deductionBucket: d.deductionBucket,
          })),
        }),
      ),
    })),
  };
}

function sheetUsesScorecardFields(sheet: SnapshotScoreSheetLike): boolean {
  return sheet.sections.some((section) =>
    section.items.some((item) => item.scoringType != null),
  );
}

export function calculateScoreFromSnapshot(sheet: SnapshotScoreSheetLike) {
  if (sheetUsesScorecardFields(sheet)) {
    const result = calculateScorecardFromSheet({
      methodology: sheet.methodology,
      totalPoints: sheet.totalPoints,
      sections: sheet.sections.map((section) => ({
        weightPercent: section.weightPercent,
        maxSectionPoints: section.maxSectionPoints,
        items: section.items.map((item) => ({
          maxPoints: item.maxPoints,
          pointType: item.pointType ?? null,
          scoringType: item.scoringType ?? "LEVELS",
          allowMultipleViolations: item.allowMultipleViolations ?? false,
          awardedPoints: item.awardedPoints,
          deductionOptions: item.deductionOptions ?? [],
          deductions: item.deductions.map((d) => ({
            optionId: d.optionId ?? null,
            pointsDeducted: d.pointsDeducted,
            violationCount: d.violationCount ?? 1,
            discretionaryPoints: d.discretionaryPoints ?? null,
            deductionBucket: d.deductionBucket,
          })),
        })),
      })),
    });
    return {
      finalScore: result.finalScore,
      originalityDeductions: result.originalityDeductions,
      conditionDeductions: result.conditionDeductions,
      sectionScores: result.categoryScores,
    };
  }
  return calculateScoreSheetScore(buildCalculateInputFromSnapshot(sheet));
}
