import { describe, expect, it } from "vitest";
import {
  applyDenseRanking,
  buildScoreSheetResultsCsv,
  computeOfficialScoreAggregate,
  csvEscape,
} from "@/lib/judging/score-sheet-results";

describe("computeOfficialScoreAggregate", () => {
  it("returns nulls when no submitted scores", () => {
    const agg = computeOfficialScoreAggregate([]);
    expect(agg.officialScore).toBeNull();
    expect(agg.judgeCount).toBe(0);
    expect(agg.highScore).toBeNull();
    expect(agg.lowScore).toBeNull();
    expect(agg.scoreSpread).toBeNull();
  });

  it("averages submitted/finalized final scores", () => {
    const agg = computeOfficialScoreAggregate([280, 300]);
    expect(agg.officialScore).toBe(290);
    expect(agg.judgeCount).toBe(2);
    expect(agg.highScore).toBe(300);
    expect(agg.lowScore).toBe(280);
    expect(agg.scoreSpread).toBe(20);
  });

  it("uses single judge score for high/low/spread", () => {
    const agg = computeOfficialScoreAggregate([293]);
    expect(agg.officialScore).toBe(293);
    expect(agg.highScore).toBe(293);
    expect(agg.lowScore).toBe(293);
    expect(agg.scoreSpread).toBe(0);
  });
});

describe("applyDenseRanking", () => {
  it("dense-ranks by official score descending", () => {
    const ranked = applyDenseRanking([
      { vehicleEntryCode: "A", officialScore: 290 },
      { vehicleEntryCode: "B", officialScore: 300 },
      { vehicleEntryCode: "C", officialScore: 290 },
    ]);
    expect(ranked.map((r) => r.vehicleEntryCode)).toEqual(["B", "A", "C"]);
    expect(ranked[0]?.rank).toBe(1);
    expect(ranked[1]?.rank).toBe(2);
    expect(ranked[2]?.rank).toBe(2);
  });

  it("flags tied rows with equal official score", () => {
    const ranked = applyDenseRanking([
      { vehicleEntryCode: "A", officialScore: 290 },
      { vehicleEntryCode: "B", officialScore: 290 },
      { vehicleEntryCode: "C", officialScore: 280 },
    ]);
    expect(ranked[0]?.isTied).toBe(true);
    expect(ranked[1]?.isTied).toBe(true);
    expect(ranked[2]?.isTied).toBe(false);
  });
});

describe("buildScoreSheetResultsCsv", () => {
  it("includes expected columns and escapes values", () => {
    const csv = buildScoreSheetResultsCsv({
      eventName: 'Cruisin "Classics"',
      judgingClassName: "Full Classic",
      ranked: [
        {
          rank: 1,
          vehicleEntryCode: "AZV-001",
          vehicleNickname: null,
          year: 1965,
          make: "Ford",
          model: "Mustang",
          vehicleClass: "Modified",
          ownerName: "Pat, O'Brien",
          officialScore: 290,
          judgeCount: 2,
          highScore: 300,
          lowScore: 280,
          scoreSpread: 20,
          draftCount: 0,
          submittedCount: 2,
          finalizedCount: 0,
          isTied: false,
          sectionAverages: [],
        },
      ],
      unrankedDraftOnly: [],
    });
    const lines = csv.split("\n");
    expect(lines[0]).toContain("event_name");
    expect(lines[0]).toContain("average_score");
    expect(lines[1]).toContain('"Cruisin ""Classics"""');
    expect(lines[1]).toContain("Pat");
    expect(lines[1]).toContain("290");
  });
});

describe("csvEscape", () => {
  it("quotes values with commas or quotes", () => {
    expect(csvEscape("plain")).toBe("plain");
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });
});
