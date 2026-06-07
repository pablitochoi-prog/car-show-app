import { REPORT_EMPTY_MESSAGES } from "@/lib/event-reports/report-types";

export type JudgeBallotReportEmptyState =
  | "no_categories"
  | "no_votes"
  | "winners_without_vote_detail";

export type JudgeBallotEmptyStateInput = {
  categoryCount: number;
  hasRankedRows: boolean;
  judgeBallotAwardWinnerCount: number;
};

/** Picks the most accurate empty-state when a judge ballot report has no ranked rows. */
export function resolveJudgeBallotReportEmptyState(
  input: JudgeBallotEmptyStateInput,
): JudgeBallotReportEmptyState | null {
  if (input.hasRankedRows) return null;

  if (input.categoryCount === 0) {
    return input.judgeBallotAwardWinnerCount > 0
      ? "winners_without_vote_detail"
      : "no_categories";
  }

  return input.judgeBallotAwardWinnerCount > 0
    ? "winners_without_vote_detail"
    : "no_votes";
}

export function judgeBallotEmptyStateMessage(
  state: JudgeBallotReportEmptyState,
): string {
  switch (state) {
    case "no_categories":
      return REPORT_EMPTY_MESSAGES.judgeBallotNoCategories;
    case "no_votes":
      return REPORT_EMPTY_MESSAGES.judgeBallotNoVotes;
    case "winners_without_vote_detail":
      return REPORT_EMPTY_MESSAGES.judgeBallotWinnersWithoutVoteDetail;
  }
}
