import type {
  JudgingDeductionBucket,
  JudgingMethodology,
  JudgingSubcategoryPointType,
  JudgingSubcategoryScoringType,
} from "@prisma/client";
import type { ScorecardTemplateInput } from "@/lib/judging/scorecard-template-validation";

export type IncrementSeed = {
  label: string;
  pointsDeducted: number;
  deductionBucket?: JudgingDeductionBucket;
};

export type SubcategorySeed = {
  label: string;
  maxPoints: number;
  isIndented?: boolean;
  pointType?: JudgingSubcategoryPointType;
  scoringType?: JudgingSubcategoryScoringType;
  allowMultipleViolations?: boolean;
  judgeGuidance?: string;
  requiresCommentOnDeduction?: boolean;
  isActive?: boolean;
  incrementLevels?: IncrementSeed[];
};

export type CategorySeed = {
  name: string;
  maxSectionPoints: number;
  judgeGuidance?: string;
  isActive?: boolean;
  subcategories: SubcategorySeed[];
};

export type GlobalTemplateSeed = {
  slug: string;
  name: string;
  description: string;
  scoringGroup: string;
  vehicleType: string;
  methodology: JudgingMethodology;
  totalPoints: number;
  sortOrder: number;
  categories: CategorySeed[];
};

const PCA_DISCRETIONARY_GUIDANCE =
  "Enter deduction from 0 up to the subcategory maximum. Remarks are required when deductions are taken.";

export function pcaDiscretionarySubcategory(
  label: string,
  maxPoints: number,
  isIndented = false,
): SubcategorySeed {
  return {
    label,
    maxPoints,
    isIndented,
    pointType: "DEDUCT",
    scoringType: "DISCRETIONARY",
    allowMultipleViolations: false,
    requiresCommentOnDeduction: true,
    judgeGuidance: PCA_DISCRETIONARY_GUIDANCE,
    isActive: true,
    incrementLevels: [],
  };
}

export function ncrsGuidance(originalityMax: number | null, conditionMax: number | null): string {
  const o =
    originalityMax == null ? "Originality none" : `Originality max: ${originalityMax}`;
  const c = conditionMax == null ? "Condition none" : `Condition max: ${conditionMax}`;
  return `${o}; ${c}. Mark originality and condition deductions separately where supported. If no deduction, mark zero.`;
}

export function ncrsDiscretionarySubcategory(
  label: string,
  maxPoints: number,
  originalityMax: number | null,
  conditionMax: number | null,
  isIndented = false,
): SubcategorySeed {
  return {
    label,
    maxPoints,
    isIndented,
    pointType: "DEDUCT",
    scoringType: "DISCRETIONARY",
    allowMultipleViolations: false,
    judgeGuidance: ncrsGuidance(originalityMax, conditionMax),
    isActive: true,
    incrementLevels: [],
  };
}

export function aacaFullSubcategory(
  label: string,
  maxPoints: number,
  isIndented = false,
): SubcategorySeed {
  return {
    label,
    maxPoints,
    isIndented,
    pointType: "DEDUCT",
    scoringType: "FULL",
    allowMultipleViolations: false,
    isActive: true,
    incrementLevels: [{ label: "Deduct", pointsDeducted: maxPoints }],
  };
}

export function aacaLevelsViolationsSubcategory(
  label: string,
  maxPoints: number,
  incrementLabel: string,
  weight: number,
  isIndented = false,
): SubcategorySeed {
  return {
    label,
    maxPoints,
    isIndented,
    pointType: "DEDUCT",
    scoringType: "LEVELS",
    allowMultipleViolations: true,
    judgeGuidance: `Cap ${maxPoints} points. Multiply ${incrementLabel} (${weight} pts) by violation count.`,
    isActive: true,
    incrementLevels: [{ label: incrementLabel, pointsDeducted: weight }],
  };
}

export function aacaDiscretionaryOther(label = "Other - Identify"): SubcategorySeed {
  return {
    label,
    maxPoints: 10,
    pointType: "DEDUCT",
    scoringType: "DISCRETIONARY",
    allowMultipleViolations: false,
    judgeGuidance: "Identify the issue and enter deduction up to the subcategory maximum.",
    isActive: true,
    incrementLevels: [],
  };
}

/** Map seed tree to scorecard validator input (active rows only). */
export function globalTemplateSeedToScorecardInput(
  seed: GlobalTemplateSeed,
): ScorecardTemplateInput {
  return {
    methodology: seed.methodology,
    totalPoints: seed.totalPoints,
    categories: seed.categories
      .filter((c) => c.isActive !== false)
      .map((category, ci) => ({
        name: category.name,
        sortOrder: ci,
        maxSectionPoints: category.maxSectionPoints,
        isActive: category.isActive !== false,
        subcategories: category.subcategories
          .filter((s) => s.isActive !== false)
          .map((sub, si) => ({
            label: sub.label,
            sortOrder: si,
            maxPoints: sub.maxPoints,
            isIndented: sub.isIndented ?? false,
            pointType: sub.pointType ?? "DEDUCT",
            scoringType: sub.scoringType ?? "LEVELS",
            allowMultipleViolations: sub.allowMultipleViolations ?? false,
            judgeGuidance: sub.judgeGuidance ?? null,
            isActive: sub.isActive !== false,
            incrementLevels: (sub.incrementLevels ?? []).map((inc, ii) => ({
              label: inc.label,
              pointsDeducted: inc.pointsDeducted,
              sortOrder: ii,
            })),
          })),
      })),
  };
}
