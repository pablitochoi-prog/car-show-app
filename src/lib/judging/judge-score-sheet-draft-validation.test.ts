import { describe, expect, it } from "vitest";
import {
  collectDeductionCommentFieldErrors,
  validateJudgeScoreSheetDraftItems,
} from "@/lib/judging/judge-score-sheet-draft-validation";
import { JudgeScoreSheetAccessError } from "@/lib/judging/judge-score-sheet-judge-data";

const sheet = {
  sections: [
    {
      items: [
        {
          id: "item-1",
          label: "Paint & Finish",
          maxPoints: 50,
          requiresCommentOnDeduction: false,
          deductionOptions: [
            { id: "opt-1", label: "Minor blemish", pointsDeducted: 1 },
          ],
        },
        {
          id: "item-2",
          label: "Engine Bay",
          maxPoints: 40,
          requiresCommentOnDeduction: true,
          deductionOptions: [
            { id: "opt-2", label: "Incorrect component", pointsDeducted: 3 },
          ],
        },
      ],
    },
  ],
};

describe("judge score sheet draft validation", () => {
  it("allows deduction without comment when not required", () => {
    expect(() =>
      validateJudgeScoreSheetDraftItems(sheet, [
        {
          itemId: "item-1",
          deductionOptionIds: ["opt-1"],
          deductionComments: {},
        },
      ]),
    ).not.toThrow();
  });

  it("rejects missing required deduction comment", () => {
    expect(() =>
      validateJudgeScoreSheetDraftItems(sheet, [
        {
          itemId: "item-2",
          deductionOptionIds: ["opt-2"],
          deductionComments: {},
        },
      ]),
    ).toThrow(JudgeScoreSheetAccessError);
  });

  it("collects field-level comment errors for the client", () => {
    const errors = collectDeductionCommentFieldErrors(sheet, [
      {
        itemId: "item-2",
        deductionOptionIds: ["opt-2"],
        deductionComments: {},
      },
    ]);
    expect(errors["item-2"]?.["opt-2"]).toBe("Deduction comment is required.");
  });
});
