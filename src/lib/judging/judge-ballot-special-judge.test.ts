import { describe, expect, it } from "vitest";
import {
  DEFAULT_BALLOT_VOTES_PER_JUDGE,
  MAX_BALLOT_CATEGORIES_PER_VEHICLE,
  userCanVoteInBallotCategory,
  userHasBallotStaffRole,
} from "@/lib/judging/judge-ballot-authorization";
import {
  BALLOT_VOTE_LIMIT_MESSAGE,
  validateJudgeBallotVoteUpsert,
} from "@/lib/judging/judge-ballot-validation";
import type { EventRole } from "@/types";

const openCategory = {
  status: "OPEN" as const,
  votesPerJudge: 10,
  maxVotesPerJudgePerVehicle: 1,
  eligibleEventCategoryIds: [] as string[],
};

describe("judge-ballot-special-judge", () => {
  it("defaults max votes per judge to 10", () => {
    expect(DEFAULT_BALLOT_VOTES_PER_JUDGE).toBe(10);
  });

  it("allows ballot staff with judge or special judge role", () => {
    expect(userHasBallotStaffRole(["JUDGE"])).toBe(true);
    expect(userHasBallotStaffRole(["SPECIAL_JUDGE"])).toBe(true);
    expect(userHasBallotStaffRole(["VOLUNTEER"])).toBe(false);
  });

  it("normal judge cannot vote special judge category", () => {
    const roles: EventRole[] = ["JUDGE"];
    expect(
      userCanVoteInBallotCategory(roles, "judge-1", {
        requiresSpecialJudge: true,
        assignedJudgeUserIds: [],
        specialJudgeUserIds: ["judge-1"],
      }),
    ).toBe(false);
  });

  it("special judge cannot vote without category assignment", () => {
    const roles: EventRole[] = ["SPECIAL_JUDGE"];
    expect(
      userCanVoteInBallotCategory(roles, "sj-1", {
        requiresSpecialJudge: true,
        assignedJudgeUserIds: [],
        specialJudgeUserIds: ["sj-2"],
      }),
    ).toBe(false);
  });

  it("assigned special judge can vote special category", () => {
    const roles: EventRole[] = ["SPECIAL_JUDGE"];
    expect(
      userCanVoteInBallotCategory(roles, "sj-1", {
        requiresSpecialJudge: true,
        assignedJudgeUserIds: [],
        specialJudgeUserIds: ["sj-1"],
      }),
    ).toBe(true);
  });

  it("normal judge can vote regular category", () => {
    const roles: EventRole[] = ["JUDGE"];
    expect(
      userCanVoteInBallotCategory(roles, "judge-1", {
        requiresSpecialJudge: false,
        assignedJudgeUserIds: [],
        specialJudgeUserIds: [],
      }),
    ).toBe(true);
  });

  it("vote limit message when category max exceeded", () => {
    const existing = Array.from({ length: 10 }, (_, i) => ({
      vehicleEntryCode: `V${i}`,
      voteCount: 1,
      status: "SUBMITTED" as const,
    }));
    const result = validateJudgeBallotVoteUpsert({
      category: openCategory,
      vehicleEntryCode: "NEW",
      vehicleEventCategoryId: null,
      proposedVoteCount: 1,
      existingVotes: existing,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("TOTAL_EXCEEDED");
      expect(result.message).toBe(BALLOT_VOTE_LIMIT_MESSAGE);
    }
  });

  it("vote limit is per category", () => {
    const full = validateJudgeBallotVoteUpsert({
      category: { ...openCategory, votesPerJudge: 2 },
      vehicleEntryCode: "C",
      vehicleEventCategoryId: null,
      proposedVoteCount: 1,
      existingVotes: [
        { vehicleEntryCode: "A", voteCount: 1, status: "SUBMITTED" },
        { vehicleEntryCode: "B", voteCount: 1, status: "SUBMITTED" },
      ],
    });
    expect(full.ok).toBe(false);

    const otherCategory = validateJudgeBallotVoteUpsert({
      category: { ...openCategory, votesPerJudge: 2 },
      vehicleEntryCode: "C",
      vehicleEventCategoryId: null,
      proposedVoteCount: 1,
      existingVotes: [],
    });
    expect(otherCategory.ok).toBe(true);
  });

  it("draft votes do not count toward limit", () => {
    const result = validateJudgeBallotVoteUpsert({
      category: openCategory,
      vehicleEntryCode: "NEW",
      vehicleEventCategoryId: null,
      proposedVoteCount: 1,
      existingVotes: [
        { vehicleEntryCode: "D1", voteCount: 0, status: "DRAFT" },
        ...Array.from({ length: 9 }, (_, i) => ({
          vehicleEntryCode: `S${i}`,
          voteCount: 1,
          status: "SUBMITTED" as const,
        })),
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("max five categories per vehicle constant", () => {
    expect(MAX_BALLOT_CATEGORIES_PER_VEHICLE).toBe(5);
  });
});
