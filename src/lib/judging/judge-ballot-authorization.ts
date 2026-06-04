import type { EventRole } from "@/types";
import { isJudgeAssignedToBallotCategory } from "@/lib/judging/judge-ballot-validation";

export const DEFAULT_BALLOT_VOTES_PER_JUDGE = 10;
export const MAX_BALLOT_CATEGORIES_PER_VEHICLE = 5;

export type BallotCategoryAuthShape = {
  requiresSpecialJudge: boolean;
  assignedJudgeUserIds: string[];
  specialJudgeUserIds: string[];
};

export function userHasBallotStaffRole(roles: EventRole[]): boolean {
  return roles.includes("JUDGE") || roles.includes("SPECIAL_JUDGE");
}

/** Whether this user may vote in a specific ballot category. */
export function userCanVoteInBallotCategory(
  roles: EventRole[],
  judgeUserId: string,
  category: BallotCategoryAuthShape,
): boolean {
  if (category.requiresSpecialJudge) {
    if (!roles.includes("SPECIAL_JUDGE")) return false;
    if (category.specialJudgeUserIds.length === 0) return false;
    return category.specialJudgeUserIds.includes(judgeUserId);
  }

  if (!roles.includes("JUDGE")) return false;
  return isJudgeAssignedToBallotCategory(
    category.assignedJudgeUserIds,
    judgeUserId,
  );
}

/** Whether category appears in judge ballot lists (visible but may be read-only if closed). */
export function userCanViewBallotCategory(
  roles: EventRole[],
  judgeUserId: string,
  category: BallotCategoryAuthShape,
): boolean {
  return userCanVoteInBallotCategory(roles, judgeUserId, category);
}
