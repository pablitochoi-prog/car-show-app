import type { EventVotingControlSnapshot } from "@/lib/judging/event-voting-control-types";

/** Client-safe voting status helpers (no Prisma / server imports). */

export type ReportVotingMethodStatus = "not_started" | "open" | "closed";

export type EventVotingMethodId =
  | "public-voting"
  | "judge-ballot"
  | "score-sheets";

export function reportVotingStatusLabel(status: ReportVotingMethodStatus): string {
  switch (status) {
    case "not_started":
      return "Not Started";
    case "open":
      return "Open for voting";
    case "closed":
      return "Closed for voting";
  }
}

/** Labels for Awards & Judging configure pages. */
export function configureVotingStatusLabel(
  status: ReportVotingMethodStatus,
): string {
  switch (status) {
    case "not_started":
      return "Voting Not Started";
    case "open":
      return "Voting Open";
    case "closed":
      return "Voting Closed";
  }
}

export function methodVotingReportStatus(
  method: EventVotingMethodId,
  snapshot: EventVotingControlSnapshot,
): ReportVotingMethodStatus {
  switch (method) {
    case "public-voting":
      return publicVotingReportStatus(snapshot.publicVoting);
    case "judge-ballot":
      return ballotVotingReportStatus(snapshot.ballot);
    case "score-sheets":
      return scoreSheetReportStatus(snapshot.scoreSheet);
  }
}

export function publicVotingReportStatus(
  publicVoting: EventVotingControlSnapshot["publicVoting"],
): ReportVotingMethodStatus {
  if (!publicVoting.configured || publicVoting.status === "not_configured") {
    return "not_started";
  }
  if (publicVoting.status === "not_started") return "not_started";
  if (publicVoting.status === "open") return "open";
  return "closed";
}

export function ballotVotingReportStatus(
  ballot: EventVotingControlSnapshot["ballot"],
): ReportVotingMethodStatus {
  if (!ballot.configured) return "not_started";
  if (ballot.openCount > 0) return "open";
  if (
    ballot.draftCount > 0 &&
    ballot.closedCount === 0 &&
    ballot.finalizedCount === 0
  ) {
    return "not_started";
  }
  return "closed";
}

export function scoreSheetReportStatus(
  scoreSheet: EventVotingControlSnapshot["scoreSheet"],
): ReportVotingMethodStatus {
  if (!scoreSheet.configured) return "not_started";
  if (scoreSheet.status === "OPEN") return "open";
  return "closed";
}

export function isVotingMethodEnabledForEvent(
  method: EventVotingMethodId,
  snapshot: EventVotingControlSnapshot,
): boolean {
  switch (method) {
    case "public-voting":
      return snapshot.publicVoting.configured;
    case "judge-ballot":
      return snapshot.ballot.configured;
    case "score-sheets":
      return snapshot.scoreSheet.configured;
  }
}
