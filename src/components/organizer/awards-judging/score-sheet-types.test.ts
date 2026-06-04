import { describe, expect, it } from "vitest";
import {
  defaultItemDraft,
  defaultLevelsDeductionOptions,
  patchItemAllowMultipleViolations,
  patchItemScoringType,
  syncItemMaxPoints,
} from "@/components/organizer/awards-judging/score-sheet-types";
import { computeSubcategoryImpact } from "@/lib/judging/scorecard-scoring";

describe("defaultLevelsDeductionOptions", () => {
  it("returns Minor, Major, Critical increment labels", () => {
    const levels = defaultLevelsDeductionOptions(10);
    expect(levels).toHaveLength(3);
    expect(levels.map((l) => l.label)).toEqual(["Minor", "Major", "Critical"]);
  });
});

describe("patchItemScoringType", () => {
  it("seeds three levels when switching to LEVELS from FULL", () => {
    const item = defaultItemDraft(0);
    const full = patchItemScoringType(item, "FULL");
    const levels = patchItemScoringType(full, "LEVELS");
    expect(levels.deductionOptions.map((o) => o.label)).toEqual([
      "Minor",
      "Major",
      "Critical",
    ]);
  });

  it("FULL without multiple violations defaults deduction to subcategory max", () => {
    const item = { ...defaultItemDraft(0), maxPoints: 10 };
    const full = patchItemScoringType(item, "FULL");
    expect(full.allowMultipleViolations).toBe(false);
    expect(full.deductionOptions).toHaveLength(1);
    expect(full.deductionOptions[0]?.pointsDeducted).toBe(10);
  });

  it("FULL with multiple violations defaults to 1 point per violation", () => {
    const item = patchItemScoringType(defaultItemDraft(0), "FULL");
    const multi = patchItemAllowMultipleViolations(item, true);
    expect(multi.deductionOptions[0]?.pointsDeducted).toBe(1);
    expect(multi.deductionOptions[0]?.label).toBe("Per violation");
  });
});

describe("FULL scoring cap", () => {
  it("caps total deduction at subcategory max for multiple violations", () => {
    expect(
      computeSubcategoryImpact(
        {
          maxPoints: 10,
          scoringType: "FULL",
          allowMultipleViolations: true,
          selections: [{ weight: 1, violationCount: 15 }],
        },
        "DEDUCTION",
      ),
    ).toBe(10);
  });
});
