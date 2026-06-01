import type {
  JudgingDeductionBucket,
  JudgingMethodology,
} from "@prisma/client";
import {
  calculateScoreSheetScore,
  type CalculateScoreInput,
  type ScoreSheetItemInput,
} from "@/lib/judging/calculate-score";

export type SnapshotScoreSheetLike = {
  methodology: JudgingMethodology;
  totalPoints: number;
  sections: Array<{
    weightPercent: number | null;
    maxSectionPoints: number | null;
    items: Array<{
      maxPoints: number;
      awardedPoints: number | null;
      deductions: Array<{
        pointsDeducted: number;
        deductionBucket: JudgingDeductionBucket | null;
      }>;
    }>;
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

export function calculateScoreFromSnapshot(sheet: SnapshotScoreSheetLike) {
  return calculateScoreSheetScore(buildCalculateInputFromSnapshot(sheet));
}
