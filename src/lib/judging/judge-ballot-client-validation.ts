import {
  validateJudgeBallotVoteUpsert,
  type JudgeBallotCategoryRules,
  type JudgeBallotVoteRow,
} from "@/lib/judging/judge-ballot-validation";

export type ClientVoteValidationInput = {
  category: JudgeBallotCategoryRules;
  vehicleEntryCode: string;
  vehicleEventCategoryId: string | null;
  proposedVoteCount: number;
  existingVotes: JudgeBallotVoteRow[];
};

export function validateClientBallotVoteChange(
  input: ClientVoteValidationInput,
): ReturnType<typeof validateJudgeBallotVoteUpsert> {
  if (!input.vehicleEntryCode.trim()) {
    return {
      ok: false,
      code: "NO_VEHICLE",
      message: "Enter a vehicle entry code.",
    };
  }
  return validateJudgeBallotVoteUpsert(input);
}

/** Max votes a judge can add to one vehicle in one action without exceeding limits. */
export function maxAddableVotes(input: {
  category: JudgeBallotCategoryRules;
  vehicleEntryCode: string;
  vehicleEventCategoryId: string | null;
  existingVotes: JudgeBallotVoteRow[];
  currentVehicleVotes: number;
}): number {
  const { category, existingVotes, vehicleEntryCode, currentVehicleVotes } =
    input;

  let max = category.maxVotesPerJudgePerVehicle - currentVehicleVotes;
  if (max <= 0) return 0;

  const otherTotal = existingVotes
    .filter((v) => v.vehicleEntryCode !== vehicleEntryCode)
    .reduce((s, v) => s + v.voteCount, 0);
  const remaining = category.votesPerJudge - otherTotal - currentVehicleVotes;
  max = Math.min(max, remaining);

  return Math.max(0, max);
}
