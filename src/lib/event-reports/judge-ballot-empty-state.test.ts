import { describe, expect, it } from "vitest";
import {
  judgeBallotEmptyStateMessage,
  resolveJudgeBallotReportEmptyState,
} from "./judge-ballot-empty-state";

describe("resolveJudgeBallotReportEmptyState", () => {
  it("returns null when ranked rows exist", () => {
    expect(
      resolveJudgeBallotReportEmptyState({
        categoryCount: 2,
        hasRankedRows: true,
        judgeBallotAwardWinnerCount: 0,
      }),
    ).toBeNull();
  });

  it("returns no_categories when nothing is configured", () => {
    expect(
      resolveJudgeBallotReportEmptyState({
        categoryCount: 0,
        hasRankedRows: false,
        judgeBallotAwardWinnerCount: 0,
      }),
    ).toBe("no_categories");
  });

  it("returns winners_without_vote_detail when awards show ballot winners but categories are missing", () => {
    expect(
      resolveJudgeBallotReportEmptyState({
        categoryCount: 0,
        hasRankedRows: false,
        judgeBallotAwardWinnerCount: 2,
      }),
    ).toBe("winners_without_vote_detail");
  });

  it("returns no_votes when categories exist but no submitted votes or award winners", () => {
    expect(
      resolveJudgeBallotReportEmptyState({
        categoryCount: 3,
        hasRankedRows: false,
        judgeBallotAwardWinnerCount: 0,
      }),
    ).toBe("no_votes");
  });

  it("returns winners_without_vote_detail when categories exist but only trophy placements are available", () => {
    expect(
      resolveJudgeBallotReportEmptyState({
        categoryCount: 1,
        hasRankedRows: false,
        judgeBallotAwardWinnerCount: 1,
      }),
    ).toBe("winners_without_vote_detail");
  });
});

describe("judgeBallotEmptyStateMessage", () => {
  it("documents the mismatch case between awards and vote totals", () => {
    const message = judgeBallotEmptyStateMessage("winners_without_vote_detail");
    expect(message).toContain("Awards");
    expect(message).toContain("vote");
  });
});
