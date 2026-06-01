import { describe, expect, it } from "vitest";
import {
  maxAddableVotes,
  validateClientBallotVoteChange,
} from "@/lib/judging/judge-ballot-client-validation";
import { isJudgeVisibleBallotStatus } from "@/lib/judging/judge-ballot-judge-data";

const openCategory = {
  status: "OPEN" as const,
  votesPerJudge: 5,
  maxVotesPerJudgePerVehicle: 2,
  eligibleEventCategoryIds: ["class-a"],
};

describe("judge-ballot-client-validation", () => {
  it("requires vehicle entry code", () => {
    const result = validateClientBallotVoteChange({
      category: openCategory,
      vehicleEntryCode: "",
      vehicleEventCategoryId: "class-a",
      proposedVoteCount: 1,
      existingVotes: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NO_VEHICLE");
  });

  it("computes max addable votes respecting per-vehicle and total limits", () => {
    expect(
      maxAddableVotes({
        category: openCategory,
        vehicleEntryCode: "A-001",
        vehicleEventCategoryId: "class-a",
        existingVotes: [
          { vehicleEntryCode: "A-002", voteCount: 3 },
        ],
        currentVehicleVotes: 0,
      }),
    ).toBe(2);

    expect(
      maxAddableVotes({
        category: openCategory,
        vehicleEntryCode: "A-001",
        vehicleEventCategoryId: "class-a",
        existingVotes: [],
        currentVehicleVotes: 1,
      }),
    ).toBe(1);
  });
});

describe("isJudgeVisibleBallotStatus", () => {
  it("hides DRAFT from judges", () => {
    expect(isJudgeVisibleBallotStatus("DRAFT")).toBe(false);
    expect(isJudgeVisibleBallotStatus("OPEN")).toBe(true);
    expect(isJudgeVisibleBallotStatus("CLOSED")).toBe(true);
    expect(isJudgeVisibleBallotStatus("FINALIZED")).toBe(true);
  });
});
