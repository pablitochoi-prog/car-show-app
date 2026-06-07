import { describe, expect, it } from "vitest";
import {
  formatOrganizerItemDeduction,
  formatOrganizerItemNotes,
  organizerItemDeductionTotal,
  resolveSectionMaxPoints,
} from "@/lib/judging/organizer-score-sheet-display";
import type { OrganizerScoreSheetItemView } from "@/lib/judging/organizer-score-sheet-vehicle-detail";

const deductionItem: OrganizerScoreSheetItemView = {
  id: "item-1",
  label: "Finish",
  maxPoints: 50,
  isIndented: false,
  awardedPoints: null,
  itemNotes: "Overall clean",
  deductions: [
    {
      label: "Minor blemish",
      pointsDeducted: 2,
      deductionBucket: null,
      comment: "Small chip",
    },
  ],
};

describe("organizer-score-sheet-display", () => {
  it("sums deduction points for deduction methodology", () => {
    expect(organizerItemDeductionTotal(deductionItem, "DEDUCTION")).toBe(2);
    expect(formatOrganizerItemDeduction(deductionItem, "DEDUCTION")).toBe("2");
  });

  it("returns blank deduction for additive methodology", () => {
    const additive: OrganizerScoreSheetItemView = {
      ...deductionItem,
      awardedPoints: 8,
      deductions: [],
    };
    expect(formatOrganizerItemDeduction(additive, "ADDITIVE")).toBe("");
    expect(formatOrganizerItemNotes(additive, "ADDITIVE")).toContain("Awarded: 8 pts");
  });

  it("resolves section max from template or item sum", () => {
    expect(resolveSectionMaxPoints(50, [{ maxPoints: 20 }, { maxPoints: 30 }])).toBe(
      50,
    );
    expect(resolveSectionMaxPoints(null, [{ maxPoints: 20 }, { maxPoints: 15 }])).toBe(
      35,
    );
  });

  it("combines notes and deduction comments", () => {
    const notes = formatOrganizerItemNotes(deductionItem, "DEDUCTION");
    expect(notes).toContain("Small chip");
    expect(notes).toContain("Overall clean");
  });
});
