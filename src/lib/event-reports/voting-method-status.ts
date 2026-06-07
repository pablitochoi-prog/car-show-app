import {
  loadEventVotingControl,
  type EventVotingControlSnapshot,
} from "@/lib/judging/event-voting-control";
import type { EventReportVotingSetup } from "@/lib/event-reports/report-types";

export type ReportVotingMethodStatus = "not_started" | "open" | "closed";

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

export async function loadReportVotingStatuses(eventId: string): Promise<{
  publicVoting: ReportVotingMethodStatus;
  judgeBallot: ReportVotingMethodStatus;
  scoreSheet: ReportVotingMethodStatus;
} | null> {
  const snapshot = await loadEventVotingControl(eventId);
  if (!snapshot) return null;

  return {
    publicVoting: publicVotingReportStatus(snapshot.publicVoting),
    judgeBallot: ballotVotingReportStatus(snapshot.ballot),
    scoreSheet: scoreSheetReportStatus(snapshot.scoreSheet),
  };
}

export async function loadEventReportVotingSetup(
  eventId: string,
): Promise<EventReportVotingSetup> {
  const snapshot = await loadEventVotingControl(eventId);
  return {
    publicVotingConfigured: snapshot?.publicVoting.configured ?? false,
    judgeBallotConfigured: snapshot?.ballot.configured ?? false,
    scoreSheetConfigured: snapshot?.scoreSheet.configured ?? false,
  };
}

export type EventVotingMethodId = "public-voting" | "judge-ballot" | "score-sheets";

/** True when the voting method is configured for this event (voting control). */
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
