import type {
  JudgingDeductionBucket,
  JudgingMethodology,
  JudgingSubcategoryPointType,
  JudgingSubcategoryScoringType,
} from "@prisma/client";
import { calculateScoreSheetScore, type CalculateScoreInput } from "@/lib/judging/calculate-score";

export type ScorecardIncrementSelection = {
  weight: number;
  violationCount?: number;
};

export type ScorecardSubcategoryScoreInput = {
  maxPoints: number;
  scoringType?: JudgingSubcategoryScoringType;
  pointType?: JudgingSubcategoryPointType | null;
  allowMultipleViolations?: boolean;
  selections?: ScorecardIncrementSelection[];
  discretionaryPoints?: number | null;
  /** Legacy bucket deductions (ORIGINALITY_CONDITION bridge). */
  legacyDeductions?: Array<{
    pointsDeducted: number;
    deductionBucket?: JudgingDeductionBucket | null;
    violationCount?: number;
  }>;
  awardedPoints?: number | null;
};

export type ScorecardCategoryScoreInput = {
  maxSectionPoints: number | null;
  weightPercent?: number | null;
  subcategories: ScorecardSubcategoryScoreInput[];
};

export type ScorecardSheetScoreInput = {
  methodology: JudgingMethodology;
  totalPoints: number;
  categories: ScorecardCategoryScoreInput[];
};

export type ScorecardSheetScoreResult = {
  finalScore: number;
  originalityDeductions: number;
  conditionDeductions: number;
  categoryScores: number[];
  subcategoryImpacts: number[][];
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function effectivePointMode(
  templateMethodology: JudgingMethodology,
  pointType?: JudgingSubcategoryPointType | null,
): "ADD" | "DEDUCT" {
  if (pointType === "ADD") return "ADD";
  if (pointType === "DEDUCT") return "DEDUCT";
  if (templateMethodology === "ADDITIVE") return "ADD";
  return "DEDUCT";
}

/** Impact applied to a subcategory (deducted points or points added), capped at max. */
export function computeSubcategoryImpact(
  sub: ScorecardSubcategoryScoreInput,
  templateMethodology: JudgingMethodology,
): number {
  const max = sub.maxPoints;
  const scoringType = sub.scoringType ?? "LEVELS";

  if (scoringType === "DISCRETIONARY") {
    const raw = sub.discretionaryPoints ?? 0;
    return clamp(Math.round(raw), 0, max);
  }

  const selections = sub.selections ?? [];
  if (selections.length === 0) {
    const legacy = sub.legacyDeductions ?? [];
    if (legacy.length === 0) return 0;
    const total = legacy.reduce(
      (sum, d) =>
        sum + d.pointsDeducted * Math.max(1, d.violationCount ?? 1),
      0,
    );
    return clamp(total, 0, max);
  }

  let total = 0;
  for (const sel of selections) {
    const count = Math.max(1, sel.violationCount ?? 1);
    total += sel.weight * count;
  }
  return clamp(total, 0, max);
}

/** Points earned toward a category for one subcategory. */
export function computeSubcategoryContribution(
  sub: ScorecardSubcategoryScoreInput,
  templateMethodology: JudgingMethodology,
): number {
  const impact = computeSubcategoryImpact(sub, templateMethodology);
  const mode = effectivePointMode(templateMethodology, sub.pointType);

  if (mode === "ADD") {
    return clamp(impact, 0, sub.maxPoints);
  }
  return clamp(sub.maxPoints - impact, 0, sub.maxPoints);
}

/** Category score with min 0 and max = category max. */
export function computeCategoryScore(
  category: ScorecardCategoryScoreInput,
  templateMethodology: JudgingMethodology,
): number {
  const categoryMax =
    category.maxSectionPoints ??
    category.subcategories.reduce((sum, s) => sum + s.maxPoints, 0);

  if (category.subcategories.length === 0) {
    return clamp(0, 0, categoryMax);
  }

  const mode =
    templateMethodology === "ADDITIVE" ? "ADD" : "DEDUCT";

  if (mode === "DEDUCT") {
    const totalImpact = category.subcategories.reduce(
      (sum, sub) => sum + computeSubcategoryImpact(sub, templateMethodology),
      0,
    );
    return clamp(categoryMax - totalImpact, 0, categoryMax);
  }

  const earned = category.subcategories.reduce(
    (sum, sub) =>
      sum + computeSubcategoryContribution(sub, templateMethodology),
    0,
  );
  return clamp(earned, 0, categoryMax);
}

function applyCategoryWeight(score: number, weightPercent?: number | null): number {
  if (weightPercent == null || weightPercent <= 0) return score;
  return (score * weightPercent) / 100;
}

/** Score a full sheet; delegates ORIGINALITY_CONDITION to legacy calculator for compatibility. */
export function calculateScorecardSheetScore(
  input: ScorecardSheetScoreInput,
): ScorecardSheetScoreResult {
  if (input.methodology === "ORIGINALITY_CONDITION") {
    return calculateScorecardViaLegacy(input);
  }

  const subcategoryImpacts = input.categories.map((cat) =>
    cat.subcategories.map((sub) =>
      computeSubcategoryImpact(sub, input.methodology),
    ),
  );

  const categoryScores = input.categories.map((cat) => {
    const raw = computeCategoryScore(cat, input.methodology);
    return applyCategoryWeight(raw, cat.weightPercent);
  });

  let originalityDeductions = 0;
  let conditionDeductions = 0;
  for (const cat of input.categories) {
    for (const sub of cat.subcategories) {
      for (const d of sub.legacyDeductions ?? []) {
        if (d.deductionBucket === "ORIGINALITY") {
          originalityDeductions += d.pointsDeducted;
        } else if (d.deductionBucket === "CONDITION") {
          conditionDeductions += d.pointsDeducted;
        }
      }
    }
  }

  const hasWeights = input.categories.some(
    (c) => c.weightPercent != null && c.weightPercent > 0,
  );
  let finalScore = categoryScores.reduce((a, b) => a + b, 0);
  if (!hasWeights) {
    finalScore = categoryScores.reduce((a, b) => a + b, 0);
  }
  finalScore = clamp(finalScore, 0, input.totalPoints);

  return {
    finalScore,
    originalityDeductions,
    conditionDeductions,
    categoryScores,
    subcategoryImpacts,
  };
}

function calculateScorecardViaLegacy(
  input: ScorecardSheetScoreInput,
): ScorecardSheetScoreResult {
  const legacyInput: CalculateScoreInput = {
    methodology: input.methodology,
    totalPoints: input.totalPoints,
    sections: input.categories.map((cat) => ({
      weightPercent: cat.weightPercent,
      maxSectionPoints: cat.maxSectionPoints,
      items: cat.subcategories.map((sub) => ({
        maxPoints: sub.maxPoints,
        awardedPoints: sub.awardedPoints,
        deductions: (sub.legacyDeductions ?? []).map((d) => ({
          pointsDeducted: d.pointsDeducted,
          deductionBucket: d.deductionBucket,
        })),
      })),
    })),
  };
  const legacy = calculateScoreSheetScore(legacyInput);
  const subcategoryImpacts = input.categories.map((cat) =>
    cat.subcategories.map((sub) =>
      computeSubcategoryImpact(sub, input.methodology),
    ),
  );
  return {
    finalScore: legacy.finalScore,
    originalityDeductions: legacy.originalityDeductions,
    conditionDeductions: legacy.conditionDeductions,
    categoryScores: legacy.sectionScores,
    subcategoryImpacts,
  };
}
