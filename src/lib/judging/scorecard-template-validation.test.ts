import { describe, expect, it } from "vitest";
import {
  isScorecardTemplateValid,
  validateScorecardTemplateStructure,
} from "@/lib/judging/scorecard-template-validation";

const baseCategory = {
  name: "Exterior",
  sortOrder: 0,
  maxSectionPoints: 100,
  subcategories: [
    {
      label: "Paint",
      sortOrder: 0,
      maxPoints: 50,
      scoringType: "LEVELS" as const,
      incrementLevels: [
        { label: "Minor", pointsDeducted: 2, sortOrder: 0 },
        { label: "Major", pointsDeducted: 5, sortOrder: 1 },
      ],
    },
  ],
};

describe("validateScorecardTemplateStructure", () => {
  it("passes a valid levels template", () => {
    expect(
      isScorecardTemplateValid({
        methodology: "DEDUCTION",
        totalPoints: 100,
        categories: [baseCategory],
      }),
    ).toBe(true);
  });

  it("requires category name and positive category max", () => {
    const errors = validateScorecardTemplateStructure({
      methodology: "DEDUCTION",
      totalPoints: 100,
      categories: [
        {
          name: "  ",
          sortOrder: 0,
          maxSectionPoints: 0,
          subcategories: [],
        },
      ],
    });
    expect(errors.some((e) => e.code === "CATEGORY_NAME_REQUIRED")).toBe(true);
    expect(errors.some((e) => e.code === "CATEGORY_MAX_INVALID")).toBe(true);
  });

  it("requires subcategory name and positive max", () => {
    const errors = validateScorecardTemplateStructure({
      methodology: "DEDUCTION",
      totalPoints: 100,
      categories: [
        {
          ...baseCategory,
          subcategories: [
            {
              label: "",
              sortOrder: 0,
              maxPoints: 0,
              scoringType: "LEVELS",
              incrementLevels: [{ label: "Minor", pointsDeducted: 1, sortOrder: 0 }],
            },
          ],
        },
      ],
    });
    expect(errors.some((e) => e.code === "SUBCATEGORY_NAME_REQUIRED")).toBe(true);
    expect(errors.some((e) => e.code === "SUBCATEGORY_MAX_INVALID")).toBe(true);
  });

  it("rejects subcategory max above category max", () => {
    const errors = validateScorecardTemplateStructure({
      methodology: "DEDUCTION",
      totalPoints: 100,
      categories: [
        {
          ...baseCategory,
          maxSectionPoints: 40,
          subcategories: [
            {
              label: "Paint",
              sortOrder: 0,
              maxPoints: 50,
              scoringType: "LEVELS",
              incrementLevels: [{ label: "Minor", pointsDeducted: 1, sortOrder: 0 }],
            },
          ],
        },
      ],
    });
    expect(errors.some((e) => e.code === "SUBCATEGORY_MAX_EXCEEDS_CATEGORY")).toBe(
      true,
    );
  });

  it("FULL requires exactly one increment level", () => {
    const none = validateScorecardTemplateStructure({
      methodology: "DEDUCTION",
      totalPoints: 100,
      categories: [
        {
          ...baseCategory,
          subcategories: [
            {
              label: "Paint",
              sortOrder: 0,
              maxPoints: 50,
              scoringType: "FULL",
              incrementLevels: [],
            },
          ],
        },
      ],
    });
    expect(none.some((e) => e.code === "FULL_REQUIRES_ONE_INCREMENT")).toBe(true);

    const two = validateScorecardTemplateStructure({
      methodology: "DEDUCTION",
      totalPoints: 100,
      categories: [
        {
          ...baseCategory,
          subcategories: [
            {
              label: "Paint",
              sortOrder: 0,
              maxPoints: 50,
              scoringType: "FULL",
              incrementLevels: [
                { label: "Select", pointsDeducted: 10, sortOrder: 0 },
                { label: "Extra", pointsDeducted: 5, sortOrder: 1 },
              ],
            },
          ],
        },
      ],
    });
    expect(two.some((e) => e.code === "FULL_REQUIRES_EXACTLY_ONE_INCREMENT")).toBe(
      true,
    );
  });

  it("LEVELS requires at least one increment", () => {
    const errors = validateScorecardTemplateStructure({
      methodology: "DEDUCTION",
      totalPoints: 100,
      categories: [
        {
          ...baseCategory,
          subcategories: [
            {
              label: "Paint",
              sortOrder: 0,
              maxPoints: 50,
              scoringType: "LEVELS",
              incrementLevels: [],
            },
          ],
        },
      ],
    });
    expect(errors.some((e) => e.code === "LEVELS_REQUIRES_INCREMENT")).toBe(true);
  });

  it("DISCRETIONARY forbids increments and multiple violations", () => {
    const errors = validateScorecardTemplateStructure({
      methodology: "DEDUCTION",
      totalPoints: 100,
      categories: [
        {
          ...baseCategory,
          subcategories: [
            {
              label: "Paint",
              sortOrder: 0,
              maxPoints: 50,
              scoringType: "DISCRETIONARY",
              allowMultipleViolations: true,
              incrementLevels: [{ label: "X", pointsDeducted: 1, sortOrder: 0 }],
            },
          ],
        },
      ],
    });
    expect(errors.some((e) => e.code === "DISCRETIONARY_NO_INCREMENTS")).toBe(true);
    expect(errors.some((e) => e.code === "DISCRETIONARY_MULTIPLE_VIOLATIONS")).toBe(
      true,
    );
  });

  it("increment weight must be positive and within subcategory max", () => {
    const errors = validateScorecardTemplateStructure({
      methodology: "DEDUCTION",
      totalPoints: 100,
      categories: [
        {
          ...baseCategory,
          subcategories: [
            {
              label: "Paint",
              sortOrder: 0,
              maxPoints: 5,
              scoringType: "LEVELS",
              incrementLevels: [
                { label: "Bad", pointsDeducted: 0, sortOrder: 0 },
                { label: "High", pointsDeducted: 10, sortOrder: 1 },
              ],
            },
          ],
        },
      ],
    });
    expect(errors.some((e) => e.code === "INCREMENT_WEIGHT_INVALID")).toBe(true);
    expect(errors.some((e) => e.code === "INCREMENT_WEIGHT_EXCEEDS_SUBCATEGORY")).toBe(
      true,
    );
  });
});
