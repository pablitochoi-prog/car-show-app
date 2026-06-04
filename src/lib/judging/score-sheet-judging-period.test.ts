import { describe, expect, it } from "vitest";
import { isScoreSheetJudgingOpen } from "@/lib/judging/score-sheet-judging-period";

describe("score-sheet-judging-period", () => {
  it("is open only when status is OPEN", () => {
    expect(isScoreSheetJudgingOpen("OPEN")).toBe(true);
    expect(isScoreSheetJudgingOpen("CLOSED")).toBe(false);
    expect(isScoreSheetJudgingOpen("FINALIZED")).toBe(false);
  });

  it("allows judges to edit when reopened from CLOSED", () => {
    expect(isScoreSheetJudgingOpen("OPEN")).toBe(true);
  });
});
