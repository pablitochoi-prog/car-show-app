import { describe, expect, it } from "vitest";
import {
  formatJudgeIdentityForOrganizer,
  isScoringStatus,
  serializeOrganizerJudgeScoreSheet,
  SCORING_STATUSES,
} from "@/lib/judging/organizer-score-sheet-vehicle-detail";

describe("isScoringStatus", () => {
  it("includes submitted and finalized only", () => {
    expect(SCORING_STATUSES).toEqual(["SUBMITTED", "FINALIZED"]);
    expect(isScoringStatus("SUBMITTED")).toBe(true);
    expect(isScoringStatus("FINALIZED")).toBe(true);
    expect(isScoringStatus("DRAFT")).toBe(false);
  });
});

describe("formatJudgeIdentityForOrganizer", () => {
  it("masks email for banned judges", () => {
    const out = formatJudgeIdentityForOrganizer({
      id: "j1",
      name: "Judge One",
      email: "judge@example.com",
      status: "BANNED",
    });
    expect(out.name).toBe("Judge One");
    expect(out.email).not.toBe("judge@example.com");
  });

  it("returns plain email for active judges", () => {
    const out = formatJudgeIdentityForOrganizer({
      id: "j1",
      name: "Judge One",
      email: "judge@example.com",
      status: "ACTIVE",
    });
    expect(out.email).toBe("judge@example.com");
  });
});

describe("serializeOrganizerJudgeScoreSheet", () => {
  const baseSheet = {
    id: "sheet-1",
    status: "SUBMITTED" as const,
    methodology: "DEDUCTION" as const,
    totalPoints: 100,
    finalScore: 88,
    originalityDeductions: 0,
    conditionDeductions: 0,
    generalNotes: "Overall good",
    submittedAt: new Date("2026-06-01T18:00:00.000Z"),
    judge: {
      id: "judge-1",
      name: "Pat Judge",
      email: "pat@example.com",
      status: "ACTIVE",
    },
    sections: [
      {
        id: "sec-1",
        name: "Paint",
        sortOrder: 0,
        weightPercent: null,
        maxSectionPoints: 50,
        items: [
          {
            id: "item-1",
            label: "Finish",
            maxPoints: 50,
            isIndented: true,
            awardedPoints: null,
            itemNotes: null,
            deductions: [
              {
                label: "Minor blemish",
                pointsDeducted: 2,
                deductionBucket: null,
                comment: "Small chip",
              },
            ],
          },
        ],
      },
    ],
  };

  it("returns item deductions with comments", () => {
    const out = serializeOrganizerJudgeScoreSheet(baseSheet);
    expect(out.judge.name).toBe("Pat Judge");
    expect(out.submittedAtLabel).toContain("2026");
    expect(out.sections[0]?.sectionMax).toBe(50);
    expect(out.sections[0]?.items[0]?.isIndented).toBe(true);
    expect(out.sections[0]?.items[0]?.deductions[0]?.comment).toBe("Small chip");
    expect(out.generalNotes).toBe("Overall good");
    expect(out.calculatedFinalScore).toBeGreaterThan(0);
  });

  it("includes originality and condition totals for O/C methodology", () => {
    const out = serializeOrganizerJudgeScoreSheet({
      ...baseSheet,
      methodology: "ORIGINALITY_CONDITION",
      originalityDeductions: 5,
      conditionDeductions: 3,
      totalPoints: 700,
    });
    expect(out.originalityDeductions).toBe(5);
    expect(out.conditionDeductions).toBe(3);
  });
});
