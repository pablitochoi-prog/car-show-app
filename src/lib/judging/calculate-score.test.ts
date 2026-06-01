import { describe, expect, it } from "vitest";
import { calculateScoreSheetScore } from "@/lib/judging/calculate-score";

describe("calculateScoreSheetScore", () => {
  it("deduction methodology sums item scores capped by section max", () => {
    const result = calculateScoreSheetScore({
      methodology: "DEDUCTION",
      totalPoints: 100,
      sections: [
        {
          maxSectionPoints: 50,
          items: [
            {
              maxPoints: 30,
              deductions: [{ pointsDeducted: 5 }],
            },
            {
              maxPoints: 30,
              deductions: [{ pointsDeducted: 10 }],
            },
          ],
        },
      ],
    });

    expect(result.finalScore).toBe(45);
    expect(result.originalityDeductions).toBe(0);
  });

  it("additive methodology sums awarded points", () => {
    const result = calculateScoreSheetScore({
      methodology: "ADDITIVE",
      totalPoints: 700,
      sections: [
        {
          weightPercent: 50,
          items: [
            { maxPoints: 150, awardedPoints: 140, deductions: [] },
            { maxPoints: 95, awardedPoints: 80, deductions: [] },
          ],
        },
        {
          weightPercent: 50,
          items: [{ maxPoints: 200, awardedPoints: 180, deductions: [] }],
        },
      ],
    });

    expect(result.finalScore).toBeGreaterThan(0);
    expect(result.finalScore).toBeLessThanOrEqual(700);
  });

  it("originality_condition subtracts bucket totals from template total", () => {
    const result = calculateScoreSheetScore({
      methodology: "ORIGINALITY_CONDITION",
      totalPoints: 700,
      sections: [
        {
          items: [
            {
              maxPoints: 200,
              deductions: [
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
