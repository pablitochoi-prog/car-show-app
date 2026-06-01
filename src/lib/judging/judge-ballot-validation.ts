import type { JudgeBallotCategoryStatus } from "@prisma/client";

export type JudgeBallotVoteRow = {
  vehicleEntryCode: string;
  voteCount: number;
};

export type JudgeBallotCategoryRules = {
  status: JudgeBallotCategoryStatus;
  votesPerJudge: number;
  maxVotesPerJudgePerVehicle: number;
  eligibleEventCategoryIds: string[];
};

export type JudgeBallotValidationInput = {
  category: JudgeBallotCategoryRules;
  vehicleEntryCode: string;
  vehicleEventCategoryId: string | null;
  proposedVoteCount: number;
  existingVotes: JudgeBallotVoteRow[];
};

export type JudgeBallotValidationResult =
  | { ok: true; totalVotesUsed: number; votesRemaining: number }
  | { ok: false; code: string; message: string };

export function sumVoteCounts(votes: JudgeBallotVoteRow[]): number {
  return votes.reduce((sum, v) => sum + v.voteCount, 0);
}

export function isVehicleEligibleForBallotCategory(
  eligibleEventCategoryIds: string[],
  vehicleEventCategoryId: string | null,
): boolean {
  if (eligibleEventCategoryIds.length === 0) return true;
  if (!vehicleEventCategoryId) return false;
  return eligibleEventCategoryIds.includes(vehicleEventCategoryId);
}

export function canEditBallotVotes(
  status: JudgeBallotCategoryStatus,
): boolean {
  return status === "OPEN";
}

export function validateJudgeBallotVoteUpsert(
  input: JudgeBallotValidationInput,
): JudgeBallotValidationResult {
  const { category, vehicleEntryCode, vehicleEventCategoryId, proposedVoteCount, existingVotes } =
    input;

  if (!canEditBallotVotes(category.status)) {
    return {
      ok: false,
      code: "CATEGORY_CLOSED",
      message: "Votes cannot be edited while this award category is closed.",
    };
  }

  if (proposedVoteCount < 0) {
    return {
      ok: false,
      code: "INVALID_VOTE_COUNT",
      message: "Vote count cannot be negative.",
    };
  }

  if (
    proposedVoteCount > 0 &&
    !isVehicleEligibleForBallotCategory(
      category.eligibleEventCategoryIds,
      vehicleEventCategoryId,
    )
  ) {
    return {
      ok: false,
      code: "VEHICLE_NOT_ELIGIBLE",
      message: "This vehicle is not eligible for this award category.",
    };
  }

  if (
    proposedVoteCount > category.maxVotesPerJudgePerVehicle
  ) {
    return {
      ok: false,
      code: "MAX_PER_VEHICLE",
      message: `You may assign at most ${category.maxVotesPerJudgePerVehicle} vote(s) to a single vehicle in this category.`,
    };
  }

  const otherVotes = existingVotes.filter(
    (v) => v.vehicleEntryCode !== vehicleEntryCode,
  );
  const otherTotal = sumVoteCounts(otherVotes);
  const totalVotesUsed = otherTotal + proposedVoteCount;

  if (totalVotesUsed > category.votesPerJudge) {
    return {
      ok: false,
      code: "TOTAL_EXCEEDED",
      message: `You have ${category.votesPerJudge - otherTotal} vote(s) remaining in this category.`,
    };
  }

  return {
    ok: true,
    totalVotesUsed,
    votesRemaining: category.votesPerJudge - totalVotesUsed,
  };
}

/** Whether a judge may vote in a category (category-specific assignment optional). */
export function isJudgeAssignedToBallotCategory(
  assignedJudgeUserIds: string[],
  judgeUserId: string,
): boolean {
  if (assignedJudgeUserIds.length === 0) return true;
  return assignedJudgeUserIds.includes(judgeUserId);
}
