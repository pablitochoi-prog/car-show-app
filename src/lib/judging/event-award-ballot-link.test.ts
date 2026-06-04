import { describe, expect, it } from "vitest";
import {
  userCanVoteInBallotCategory,
  userHasBallotStaffRole,
} from "@/lib/judging/judge-ballot-authorization";

describe("event-award-ballot-link (designation rules)", () => {
  it("special judge staff role is distinct from regular judge", () => {
    expect(userHasBallotStaffRole(["SPECIAL_JUDGE"])).toBe(true);
    expect(
      userCanVoteInBallotCategory(["JUDGE"], "u1", {
        requiresSpecialJudge: true,
        assignedJudgeUserIds: [],
        specialJudgeUserIds: ["u1"],
      }),
    ).toBe(false);
  });
});
