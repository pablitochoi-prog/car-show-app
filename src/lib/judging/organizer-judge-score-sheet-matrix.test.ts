import { describe, expect, it } from "vitest";
import { formatOrganizerItemDeduction } from "@/lib/judging/organizer-score-sheet-display";
import {
  buildJudgeScoreSheetMatrixCsv,
  judgeScoreSheetMatrixCsvFilename,
} from "@/lib/judging/organizer-judge-score-sheet-matrix";
import type { OrganizerJudgeScoreSheetMatrix } from "@/lib/judging/organizer-judge-score-sheet-matrix";

describe("organizer-judge-score-sheet-matrix deduction cells", () => {
  it("formats blank when no deductions recorded", () => {
    expect(
      formatOrganizerItemDeduction(
        {
          id: "1",
          label: "Paint",
          maxPoints: 50,
          isIndented: false,
          awardedPoints: null,
          itemNotes: null,
          deductions: [],
        },
        "DEDUCTION",
      ),
    ).toBe("");
  });

  it("sums multiple deduction lines for matrix display", () => {
    expect(
      formatOrganizerItemDeduction(
        {
          id: "1",
          label: "Paint",
          maxPoints: 50,
          isIndented: false,
          awardedPoints: null,
          itemNotes: null,
          deductions: [
            { label: "A", pointsDeducted: 2, deductionBucket: null, comment: null },
            { label: "B", pointsDeducted: 3, deductionBucket: null, comment: null },
          ],
        },
        "DEDUCTION",
      ),
    ).toBe("5");
  });
});

describe("buildJudgeScoreSheetMatrixCsv", () => {
  const matrix: OrganizerJudgeScoreSheetMatrix = {
    judge: { userId: "j1", name: "Pat Judge", email: "pat@example.com" },
    judgingClass: {
      id: "c1",
      name: "Concours",
      methodology: "DEDUCTION",
      totalPoints: 350,
    },
    vehicles: [
      {
        vehicleEntryCode: "KVE-001",
        year: 1969,
        make: "Porsche",
        model: "911",
        ownerName: "Alex Owner",
        finalScore: 308,
        totalPoints: 350,
      },
      {
        vehicleEntryCode: "KVE-002",
        year: 1970,
        make: "Ford",
        model: "Mustang",
        ownerName: null,
        finalScore: 320,
        totalPoints: 350,
      },
    ],
    rows: [
      {
        kind: "total",
        scoresByVehicle: { "KVE-001": "308 / 350", "KVE-002": "320 / 350" },
      },
      { kind: "section", sectionName: "Paint", sectionSortOrder: 0 },
      {
        kind: "item",
        rowKey: "0:0",
        sectionSortOrder: 0,
        itemSortOrder: 0,
        label: "Finish",
        isIndented: false,
        maxPoints: 50,
        deductionsByVehicle: { "KVE-001": "2", "KVE-002": "" },
      },
      {
        kind: "subtotal",
        sectionSortOrder: 0,
        sectionMax: 50,
        scoresByVehicle: { "KVE-001": "48 / 50", "KVE-002": "50 / 50" },
      },
    ],
  };

  it("includes metadata, vehicle headers, and deduction cells", () => {
    const csv = buildJudgeScoreSheetMatrixCsv({
      eventName: "Annual Meet",
      matrix,
    });
    expect(csv).toContain("event_name,Annual Meet");
    expect(csv).toContain("judge_name,Pat Judge");
    expect(csv).toContain("row_type,subcategory,max_points,KVE-001,KVE-002");
    expect(csv).toContain("vehicle,,,1969 Porsche 911,1970 Ford Mustang");
    expect(csv).toContain("owner,,,Alex Owner,");
    expect(csv).toContain("total_score,TOTAL SCORE FOR VEHICLE,,308 / 350,320 / 350");
    expect(csv).toContain("section,PAINT,,,");
    expect(csv).toContain("subtotal,SECTION SUBTOTAL,50,48 / 50,50 / 50");
    expect(csv).toContain("item,Finish,50,2,");
  });

  it("builds a readable export filename", () => {
    expect(
      judgeScoreSheetMatrixCsvFilename({
        eventId: "evt-abcdef12",
        judgeName: "Pat Judge",
        className: "PCA Zone 8",
      }),
    ).toBe("judge-scorecard-evt-abcd-pat-judge-pca-zone-8.csv");
  });
});
