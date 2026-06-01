import { describe, expect, it } from "vitest";
import {
  canEditBallotVotes,
  isJudgeAssignedToBallotCategory,
  isVehicleEligibleForBallotCategory,
  sumVoteCounts,
  validateJudgeBallotVoteUpsert,
} from "@/lib/judging/judge-ballot-validation";

const openCategory = {
  status: "OPEN" as const,
  votesPerJudge: 5,
  maxVotesPerJudgePerVehicle: 2,
  eligibleEventCategoryIds: [] as string[],
};

describe("judge-ballot-validation", () => {
  it("sumVoteCounts totals vote rows", () => {
    expect(
      sumVoteCounts([
        { vehicleEntryCode: "A", voteCount: 2 },
        { vehicleEntryCode: "B", voteCount: 1 },
      ]),
    ).toBe(3);
  });

  it("empty eligible class list means all vehicles eligible", () => {
    expect(isVehicleEligibleForBallotCategory([], null)).toBe(true);
    expect(isVehicleEligibleForBallotCategory([], "cat-1")).toBe(true);
  });

  it("restricted eligible classes require matching eventCategoryId", () => {
    expect(
      isVehicleEligibleForBallotCategory(["cat-1"], "cat-1"),
    ).toBe(true);
    expect(
      isVehicleEligibleForBallotCategory(["cat-1"], "cat-2"),
    ).toBe(false);
    expect(isVehicleEligibleForBallotCategory(["cat-1"], null)).toBe(false);
  });

  it("blocks edits when category is not OPEN", () => {
    expect(canEditBallotVotes("OPEN")).toBe(true);
    expect(canEditBallotVotes("CLOSED")).toBe(false);
    expect(canEditBallotVotes("FINALIZED")).toBe(false);
  });

  it("enforces total votes per judge per category", () => {
    const existing = [
      { vehicleEntryCode: "101", voteCount: 2 },
      { vehicleEntryCode: "112", voteCount: 2 },
    ];

    const ok = validateJudgeBallotVoteUpsert({
      category: openCategory,
      vehicleEntryCode: "145",
      vehicleEventCategoryId: null,
      proposedVoteCount: 1,
      existingVotes: existing,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.votesRemaining).toBe(0);

    const over = validateJudgeBallotVoteUpsert({
      category: openCategory,
      vehicleEntryCode: "145",
      vehicleEventCategoryId: null,
      proposedVoteCount: 2,
      existingVotes: existing,
    });
    expect(over.ok).toBe(false);
    if (!over.ok) expect(over.code).toBe("TOTAL_EXCEEDED");
  });

  it("enforces max votes per vehicle", () => {
    const result = validateJudgeBallotVoteUpsert({
      category: openCategory,
      vehicleEntryCode: "101",
      vehicleEventCategoryId: null,
      proposedVoteCount: 3,
      existingVotes: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("MAX_PER_VEHICLE");
  });

  it("category judge assignment: empty means all judges", () => {
    expect(isJudgeAssignedToBallotCategory([], "judge-1")).toBe(true);
    expect(
      isJudgeAssignedToBallotCategory(["judge-1"], "judge-1"),
    ).toBe(true);
    expect(
      isJudgeAssignedToBallotCategory(["judge-1"], "judge-2"),
    ).toBe(false);
  });
});
