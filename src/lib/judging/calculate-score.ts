import type { JudgingDeductionBucket, JudgingMethodology } from "@prisma/client";

export type ScoreSheetItemInput = {
  maxPoints: number;
  awardedPoints?: number | null;
  deductions: Array<{
    pointsDeducted: number;
    deductionBucket?: JudgingDeductionBucket | null;
  }>;
};

export type ScoreSheetSectionInput = {
  weightPercent?: number | null;
  maxSectionPoints?: number | null;
  items: ScoreSheetItemInput[];
};

export type CalculateScoreInput = {
  methodology: JudgingMethodology;
  totalPoints: number;
  sections: ScoreSheetSectionInput[];
};

export type CalculateScoreResult = {
  finalScore: number;
  originalityDeductions: number;
  conditionDeductions: number;
  sectionScores: number[];
};

function itemDeductionTotal(item: ScoreSheetItemInput): number {
  return item.deductions.reduce((sum, d) => sum + d.pointsDeducted, 0);
}

function itemScoreDeduction(item: ScoreSheetItemInput): number {
  const deducted = itemDeductionTotal(item);
  return Math.max(0, item.maxPoints - deducted);
}

function itemScoreAdditive(item: ScoreSheetItemInput): number {
  const awarded = item.awardedPoints ?? 0;
  return Math.min(item.maxPoints, Math.max(0, awarded));
}

function sectionRawScore(
  methodology: JudgingMethodology,
  section: ScoreSheetSectionInput,
): number {
  if (section.items.length === 0) return 0;

  const itemScores = section.items.map((item) => {
    switch (methodology) {
      case "ADDITIVE":
        return itemScoreAdditive(item);
      case "DEDUCTION":
      case "ORIGINALITY_CONDITION":
        return itemScoreDeduction(item);
      default:
        return 0;
    }
  });

  const raw = itemScores.reduce((a, b) => a + b, 0);
  if (section.maxSectionPoints != null) {
    return Math.min(section.maxSectionPoints, raw);
  }
  return raw;
}

function applySectionWeight(score: number, weightPercent?: number | null): number {
  if (weightPercent == null || weightPercent <= 0) return score;
  return (score * weightPercent) / 100;
}

/** Pure score calculation for structured judge score sheets. */
export function calculateScoreSheetScore(
  input: CalculateScoreInput,
): CalculateScoreResult {
  const { methodology, totalPoints, sections } = input;

  let originalityDeductions = 0;
  let conditionDeductions = 0;

  for (const section of sections) {
    for (const item of section.items) {
      for (const d of item.deductions) {
        if (d.deductionBucket === "ORIGINALITY") {
          originalityDeductions += d.pointsDeducted;
        } else if (d.deductionBucket === "CONDITION") {
          conditionDeductions += d.pointsDeducted;
        }
      }
    }
  }

  const sectionScores = sections.map((section) => {
    const raw = sectionRawScore(methodology, section);
    return applySectionWeight(raw, section.weightPercent);
  });

  let finalScore: number;

  if (methodology === "ORIGINALITY_CONDITION") {
    finalScore = Math.max(
      0,
      totalPoints - originalityDeductions - conditionDeductions,
    );
  } else {
    const hasWeights = sections.some(
      (s) => s.weightPercent != null && s.weightPercent > 0,
    );
    finalScore = hasWeights
      ? sectionScores.reduce((a, b) => a + b, 0)
      : sectionScores.reduce((a, b) => a + b, 0);
    finalScore = Math.min(totalPoints, Math.max(0, finalScore));
  }

  return {
    finalScore,
    originalityDeductions,
    conditionDeductions,
    sectionScores,
  };
}
