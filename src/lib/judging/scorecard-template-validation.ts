import type {
  JudgingMethodology,
  JudgingSubcategoryPointType,
  JudgingSubcategoryScoringType,
} from "@prisma/client";

export type ScorecardIncrementLevelInput = {
  label: string;
  pointsDeducted: number;
  sortOrder: number;
};

export type ScorecardSubcategoryInput = {
  label: string;
  sortOrder: number;
  maxPoints: number;
  isIndented?: boolean;
  pointType?: JudgingSubcategoryPointType | null;
  scoringType?: JudgingSubcategoryScoringType;
  allowMultipleViolations?: boolean;
  judgeGuidance?: string | null;
  isActive?: boolean;
  incrementLevels: ScorecardIncrementLevelInput[];
};

export type ScorecardCategoryInput = {
  name: string;
  sortOrder: number;
  maxSectionPoints: number | null;
  isActive?: boolean;
  subcategories: ScorecardSubcategoryInput[];
};

export type ScorecardTemplateInput = {
  methodology: JudgingMethodology;
  totalPoints: number;
  categories: ScorecardCategoryInput[];
};

export type ScorecardValidationErrorCode =
  | "CATEGORY_NAME_REQUIRED"
  | "CATEGORY_MAX_INVALID"
  | "SUBCATEGORY_NAME_REQUIRED"
  | "SUBCATEGORY_MAX_INVALID"
  | "SUBCATEGORY_MAX_EXCEEDS_CATEGORY"
  | "FULL_REQUIRES_ONE_INCREMENT"
  | "FULL_REQUIRES_EXACTLY_ONE_INCREMENT"
  | "LEVELS_REQUIRES_INCREMENT"
  | "DISCRETIONARY_NO_INCREMENTS"
  | "DISCRETIONARY_MULTIPLE_VIOLATIONS"
  | "INCREMENT_WEIGHT_INVALID"
  | "INCREMENT_WEIGHT_EXCEEDS_SUBCATEGORY";

export type ScorecardValidationError = {
  code: ScorecardValidationErrorCode;
  message: string;
  categoryIndex?: number;
  subcategoryIndex?: number;
  incrementIndex?: number;
};

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

export function validateScorecardTemplateStructure(
  input: ScorecardTemplateInput,
): ScorecardValidationError[] {
  const errors: ScorecardValidationError[] = [];

  for (let ci = 0; ci < input.categories.length; ci++) {
    const category = input.categories[ci];
    if (!category.name.trim()) {
      errors.push({
        code: "CATEGORY_NAME_REQUIRED",
        message: "Category name is required.",
        categoryIndex: ci,
      });
    }

    const categoryMax = category.maxSectionPoints;
    if (categoryMax == null || !isPositiveInteger(categoryMax)) {
      errors.push({
        code: "CATEGORY_MAX_INVALID",
        message: "Category max score must be a positive integer.",
        categoryIndex: ci,
      });
    }

    for (let si = 0; si < category.subcategories.length; si++) {
      const sub = category.subcategories[si];
      if (!sub.label.trim()) {
        errors.push({
          code: "SUBCATEGORY_NAME_REQUIRED",
          message: "Subcategory name is required.",
          categoryIndex: ci,
          subcategoryIndex: si,
        });
      }

      if (!isPositiveInteger(sub.maxPoints)) {
        errors.push({
          code: "SUBCATEGORY_MAX_INVALID",
          message: "Subcategory max score must be a positive integer.",
          categoryIndex: ci,
          subcategoryIndex: si,
        });
      }

      if (
        categoryMax != null &&
        isPositiveInteger(categoryMax) &&
        isPositiveInteger(sub.maxPoints) &&
        sub.maxPoints > categoryMax
      ) {
        errors.push({
          code: "SUBCATEGORY_MAX_EXCEEDS_CATEGORY",
          message: `Subcategory max (${sub.maxPoints}) cannot exceed category max (${categoryMax}).`,
          categoryIndex: ci,
          subcategoryIndex: si,
        });
      }

      const scoringType = sub.scoringType ?? "LEVELS";
      const increments = sub.incrementLevels ?? [];
      const allowMultiple = sub.allowMultipleViolations ?? false;

      if (scoringType === "DISCRETIONARY") {
        if (increments.length > 0) {
          errors.push({
            code: "DISCRETIONARY_NO_INCREMENTS",
            message: "Discretionary subcategories must not define increment levels.",
            categoryIndex: ci,
            subcategoryIndex: si,
          });
        }
        if (allowMultiple) {
          errors.push({
            code: "DISCRETIONARY_MULTIPLE_VIOLATIONS",
            message: "Multiple violations cannot be enabled for discretionary subcategories.",
            categoryIndex: ci,
            subcategoryIndex: si,
          });
        }
      } else if (scoringType === "FULL") {
        if (increments.length === 0) {
          errors.push({
            code: "FULL_REQUIRES_ONE_INCREMENT",
            message: "Full scoring requires exactly one increment level.",
            categoryIndex: ci,
            subcategoryIndex: si,
          });
        } else if (increments.length !== 1) {
          errors.push({
            code: "FULL_REQUIRES_EXACTLY_ONE_INCREMENT",
            message: "Full scoring must have exactly one increment level.",
            categoryIndex: ci,
            subcategoryIndex: si,
          });
        }
      } else if (scoringType === "LEVELS") {
        if (increments.length < 1) {
          errors.push({
            code: "LEVELS_REQUIRES_INCREMENT",
            message: "Levels scoring requires at least one increment level.",
            categoryIndex: ci,
            subcategoryIndex: si,
          });
        }
      }

      for (let ii = 0; ii < increments.length; ii++) {
        const inc = increments[ii];
        if (!isPositiveInteger(inc.pointsDeducted)) {
          errors.push({
            code: "INCREMENT_WEIGHT_INVALID",
            message: "Increment level weight must be a positive integer.",
            categoryIndex: ci,
            subcategoryIndex: si,
            incrementIndex: ii,
          });
        } else if (
          isPositiveInteger(sub.maxPoints) &&
          inc.pointsDeducted > sub.maxPoints
        ) {
          errors.push({
            code: "INCREMENT_WEIGHT_EXCEEDS_SUBCATEGORY",
            message: `Increment weight (${inc.pointsDeducted}) cannot exceed subcategory max (${sub.maxPoints}).`,
            categoryIndex: ci,
            subcategoryIndex: si,
            incrementIndex: ii,
          });
        }
      }
    }
  }

  return errors;
}

/** True when template has no blocking scorecard validation errors. */
export function isScorecardTemplateValid(input: ScorecardTemplateInput): boolean {
  return validateScorecardTemplateStructure(input).length === 0;
}
