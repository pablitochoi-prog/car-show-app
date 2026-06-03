import { describe, expect, it } from "vitest";
import { JudgeScoreSheetAccessError } from "@/lib/judging/judge-score-sheet-judge-data";
import { validateScorecardItemDraft } from "@/lib/judging/judge-assigned-scorecard-validation";

const baseItem = {
  id: "item-1",
  label: "Coachwork",
  maxPoints: 15,
  scoringType: "DISCRETIONARY" as const,
  allowMultipleViolations: false,
  requiresCommentOnDeduction: false,
  deductionOptions: [],
};

describe("validateScorecardItemDraft", () => {
  it("accepts discretionary 0..max", () => {
    expect(() =>
      validateScorecardItemDraft(baseItem, { itemId: "item-1", discretionaryPoints: 7 }, "DEDUCTION"),
    ).not.toThrow();
  });

  it("rejects discretionary above max", () => {
    expect(() =>
      validateScorecardItemDraft(
        baseItem,
        { itemId: "item-1", discretionaryPoints: 20 },
        "DEDUCTION",
      ),
    ).toThrow(JudgeScoreSheetAccessError);
  });

  it("caps LEVELS violations at subcategory max", () => {
    const item = {
      ...baseItem,
      scoringType: "LEVELS" as const,
      allowMultipleViolations: true,
      deductionOptions: [{ id: "opt-1", pointsDeducted: 5 }],
    };
    expect(() =>
      validateScorecardItemDraft(
        item,
        {
          itemId: "item-1",
          levelSelections: [{ optionId: "opt-1", violationCount: 10 }],
        },
        "DEDUCTION",
      ),
    ).not.toThrow();
  });

  it("FULL uses selected weight", () => {
    const item = {
      ...baseItem,
      scoringType: "FULL" as const,
      maxPoints: 10,
      deductionOptions: [{ id: "opt-1", pointsDeducted: 10 }],
    };
    expect(() =>
      validateScorecardItemDraft(
        item,
        { itemId: "item-1", levelSelections: [{ optionId: "opt-1" }] },
        "DEDUCTION",
      ),
    ).not.toThrow();
  });
});
