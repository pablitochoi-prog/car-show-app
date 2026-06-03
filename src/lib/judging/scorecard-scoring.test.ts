import { describe, expect, it } from "vitest";
import {
  calculateScorecardSheetScore,
  computeCategoryScore,
  computeSubcategoryContribution,
  computeSubcategoryImpact,
} from "@/lib/judging/scorecard-scoring";

describe("computeSubcategoryImpact", () => {
  it("caps multiple violations at subcategory max", () => {
    const impact = computeSubcategoryImpact(
      {
        maxPoints: 10,
        scoringType: "LEVELS",
        allowMultipleViolations: true,
        selections: [{ weight: 5, violationCount: 3 }],
      },
      "DEDUCTION",
    );
    expect(impact).toBe(10);
  });

  it("does not apply violation multiplier for discretionary", () => {
    const impact = computeSubcategoryImpact(
      {
        maxPoints: 20,
        scoringType: "DISCRETIONARY",
        discretionaryPoints: 7,
      },
      "DEDUCTION",
    );
    expect(impact).toBe(7);
  });

  it("clamps discretionary input to 0..max", () => {
    expect(
      computeSubcategoryImpact(
        {
          maxPoints: 15,
          scoringType: "DISCRETIONARY",
          discretionaryPoints: 99,
        },
        "DEDUCTION",
      ),
    ).toBe(15);
    expect(
      computeSubcategoryImpact(
        {
          maxPoints: 15,
          scoringType: "DISCRETIONARY",
          discretionaryPoints: -3,
        },
        "DEDUCTION",
      ),
    ).toBe(0);
  });

  it("FULL uses selected increment weight", () => {
    expect(
      computeSubcategoryImpact(
        {
          maxPoints: 50,
          scoringType: "FULL",
          selections: [{ weight: 12 }],
        },
        "DEDUCTION",
      ),
    ).toBe(12);
  });
});

describe("computeCategoryScore", () => {
  it("DEDUCTION starts at category max and subtracts impacts", () => {
    const score = computeCategoryScore(
      {
        maxSectionPoints: 100,
        subcategories: [
          {
            maxPoints: 50,
            scoringType: "LEVELS",
            selections: [{ weight: 10 }],
          },
          {
            maxPoints: 50,
            scoringType: "FULL",
            selections: [{ weight: 5 }],
          },
        ],
      },
      "DEDUCTION",
    );
    expect(score).toBe(85);
  });

  it("never goes below 0 or above category max", () => {
    expect(
      computeCategoryScore(
        {
          maxSectionPoints: 30,
          subcategories: [
            {
              maxPoints: 20,
              scoringType: "LEVELS",
              selections: [{ weight: 15 }],
            },
            {
              maxPoints: 20,
              scoringType: "LEVELS",
              selections: [{ weight: 20 }],
            },
          ],
        },
        "DEDUCTION",
      ),
    ).toBe(0);

    expect(
      computeCategoryScore(
        {
          maxSectionPoints: 30,
          subcategories: [
            {
              maxPoints: 10,
              scoringType: "DISCRETIONARY",
              discretionaryPoints: 2,
              pointType: "ADD",
            },
            {
              maxPoints: 10,
              scoringType: "DISCRETIONARY",
              discretionaryPoints: 2,
              pointType: "ADD",
            },
          ],
        },
        "ADDITIVE",
      ),
    ).toBe(4);
  });

  it("ADDITIVE starts at 0 and adds contributions", () => {
    const score = computeCategoryScore(
      {
        maxSectionPoints: 100,
        subcategories: [
          {
            maxPoints: 40,
            scoringType: "DISCRETIONARY",
            discretionaryPoints: 25,
          },
          {
            maxPoints: 40,
            scoringType: "LEVELS",
            pointType: "ADD",
            selections: [{ weight: 10 }],
          },
        ],
      },
      "ADDITIVE",
    );
    expect(score).toBe(35);
  });
});

describe("computeSubcategoryContribution", () => {
  it("returns earned points for deduction mode", () => {
    expect(
      computeSubcategoryContribution(
        {
          maxPoints: 30,
          scoringType: "LEVELS",
          selections: [{ weight: 8 }],
        },
        "DEDUCTION",
      ),
    ).toBe(22);
  });
});

describe("calculateScorecardSheetScore", () => {
  it("aggregates category scores and caps final at template total", () => {
    const result = calculateScorecardSheetScore({
      methodology: "DEDUCTION",
      totalPoints: 100,
      categories: [
        {
          maxSectionPoints: 60,
          subcategories: [
            {
              maxPoints: 30,
              scoringType: "LEVELS",
              selections: [{ weight: 5 }],
            },
            {
              maxPoints: 30,
              scoringType: "FULL",
              selections: [{ weight: 3 }],
            },
          ],
        },
        {
          maxSectionPoints: 40,
          subcategories: [
            {
              maxPoints: 40,
              scoringType: "DISCRETIONARY",
              discretionaryPoints: 10,
            },
          ],
        },
      ],
    });
    expect(result.categoryScores[0]).toBe(52);
    expect(result.categoryScores[1]).toBe(30);
    expect(result.finalScore).toBe(82);
  });

  it("preserves ORIGINALITY_CONDITION via legacy bridge", () => {
    const result = calculateScorecardSheetScore({
      methodology: "ORIGINALITY_CONDITION",
      totalPoints: 700,
      categories: [
        {
          maxSectionPoints: null,
          subcategories: [
            {
              maxPoints: 200,
              legacyDeductions: [
                { pointsDeducted: 20, deductionBucket: "ORIGINALITY" },
                { pointsDeducted: 10, deductionBucket: "CONDITION" },
              ],
            },
          ],
        },
      ],
    });
    expect(result.originalityDeductions).toBe(20);
    expect(result.conditionDeductions).toBe(10);
    expect(result.finalScore).toBe(670);
  });
});
