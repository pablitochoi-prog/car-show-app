import { describe, expect, it } from "vitest";
import { JudgeScoreSheetAccessError } from "@/lib/judging/judge-score-sheet-judge-data";
import { itemDraftMissingRequiredComment } from "@/lib/judging/scorecard-required-comment";
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

describe("itemDraftMissingRequiredComment", () => {
  it("flags FULL selection without note when required", () => {
    expect(
      itemDraftMissingRequiredComment(
        {
          scoringType: "FULL",
          requiresCommentOnDeduction: true,
          maxPoints: 10,
        },
        {
          discretionaryPoints: "",
          selectedOptionIds: ["opt-1"],
          itemNotes: "",
        },
      ),
    ).toBe(true);
  });

  it("clears when note is present", () => {
    expect(
      itemDraftMissingRequiredComment(
        {
          scoringType: "FULL",
          requiresCommentOnDeduction: true,
          maxPoints: 10,
        },
        {
          discretionaryPoints: "",
          selectedOptionIds: ["opt-1"],
          itemNotes: "Chip on dash",
        },
      ),
    ).toBe(false);
  });
});

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
      deductionOptions: [{ id: "opt-1", label: "Full", pointsDeducted: 10 }],
    };
    expect(() =>
      validateScorecardItemDraft(
        item,
        { itemId: "item-1", levelSelections: [{ optionId: "opt-1" }] },
        "DEDUCTION",
      ),
    ).not.toThrow();
  });

  it("skips required comment on save-for-later when requireComments is false", () => {
    const item = {
      ...baseItem,
      scoringType: "FULL" as const,
      maxPoints: 10,
      requiresCommentOnDeduction: true,
      deductionOptions: [{ id: "opt-1", label: "Major", pointsDeducted: 10 }],
    };
    expect(() =>
      validateScorecardItemDraft(
        item,
        { itemId: "item-1", levelSelections: [{ optionId: "opt-1" }] },
        "DEDUCTION",
        { requireComments: false },
      ),
    ).not.toThrow();
  });

  it("requires comment on submit when requireComments is true", () => {
    const item = {
      ...baseItem,
      scoringType: "FULL" as const,
      maxPoints: 10,
      requiresCommentOnDeduction: true,
      deductionOptions: [{ id: "opt-1", label: "Major", pointsDeducted: 10 }],
    };
    expect(() =>
      validateScorecardItemDraft(
        item,
        { itemId: "item-1", levelSelections: [{ optionId: "opt-1" }] },
        "DEDUCTION",
        { requireComments: true },
      ),
    ).toThrow(JudgeScoreSheetAccessError);
  });
});
