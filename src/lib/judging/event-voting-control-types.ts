import type {
  EventAwardsVotingStatus,
  ScoreSheetJudgingPeriodStatus,
} from "@prisma/client";

/** Client-safe types for event voting control (no Prisma / server imports). */

export type EventVotingOverallStatus = EventAwardsVotingStatus;

export type EventVotingControlSnapshot = {
  overall: EventVotingOverallStatus;
  publicVoting: {
    configured: boolean;
    status: "open" | "closed" | "not_started" | "not_configured";
  };
  ballot: {
    configured: boolean;
    openCount: number;
    closedCount: number;
    finalizedCount: number;
    draftCount: number;
  };
  scoreSheet: {
    configured: boolean;
    status: ScoreSheetJudgingPeriodStatus;
  };
  canCloseAll: boolean;
  canOpenAll: boolean;
  canReopenAll: boolean;
  canFinalizeAll: boolean;
  canUnfinalizeAll: boolean;
  trophyWinnersEnabled: boolean;
};

export type EventVotingMethodKey =
  | "public-voting"
  | "judge-ballot"
  | "score-sheets";

export type VotingMethodControlAction = "open" | "close" | "reopen";

export function isEventVotingReadyForTrophies(
  snapshot: EventVotingControlSnapshot,
): boolean {
  return snapshot.trophyWinnersEnabled;
}
