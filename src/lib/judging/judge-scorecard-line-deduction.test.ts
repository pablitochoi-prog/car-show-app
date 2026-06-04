import { describe, expect, it } from "vitest";
import {
  computeItemLineDeduction,
  computeSectionDeductionSummary,
  levelButtonLabel,
} from "@/lib/judging/judge-scorecard-line-deduction";

describe("levelButtonLabel", () => {
  it("uses full words for standard level names", () => {
    expect(levelButtonLabel("Minor")).toBe("Minimum");
    expect(levelButtonLabel("Major")).toBe("Major");
    expect(levelButtonLabel("Critical")).toBe("Critical");
  });
});

describe("computeItemLineDeduction", () => {
  const item = {
    maxPoints: 10,
    scoringType: "LEVELS",
    allowMultipleViolations: false,
    deductionOptions: [
      { id: "a", label: "Minor", pointsDeducted: 2 },
      { id: "b", label: "Major", pointsDeducted: 5 },
      { id: "c", label: "Critical", pointsDeducted: 10 },
    ],
  };

  it("returns selected level deduction for LEVELS", () => {
    expect(
      computeItemLineDeduction(
        item,
        { discretionaryPoints: "", selectedOptionIds: ["b"], violationCounts: {}, itemNotes: "" },
        "DEDUCTION",
      ),
    ).toBe(5);
  });

  it("returns zero when no level selected", () => {
    expect(
      computeItemLineDeduction(
        item,
        { discretionaryPoints: "", selectedOptionIds: [], violationCounts: {}, itemNotes: "" },
        "DEDUCTION",
      ),
    ).toBe(0);
  });
});

describe("computeSectionDeductionSummary", () => {
  const items = [
    {
      id: "i1",
      maxPoints: 10,
      scoringType: "LEVELS",
      allowMultipleViolations: false,
      deductionOptions: [
        { id: "a", label: "Minor", pointsDeducted: 2 },
        { id: "b", label: "Major", pointsDeducted: 5 },
      ],
    },
    {
      id: "i2",
      maxPoints: 8,
      scoringType: "LEVELS",
      allowMultipleViolations: false,
      deductionOptions: [{ id: "c", label: "Minor", pointsDeducted: 1 }],
    },
  ];

  it("sums deductions and category score for the section", () => {
    const drafts = {
      i1: {
        discretionaryPoints: "",
        selectedOptionIds: ["b"],
        violationCounts: {},
        itemNotes: "",
      },
      i2: {
        discretionaryPoints: "",
        selectedOptionIds: ["c"],
        violationCounts: {},
        itemNotes: "",
      },
    };
    const summary = computeSectionDeductionSummary(
      items,
      drafts,
      "DEDUCTION",
      18,
    );
    expect(summary.totalDeductions).toBe(6);
    expect(summary.sectionMax).toBe(18);
    expect(summary.sectionScore).toBe(12);
  });
});
