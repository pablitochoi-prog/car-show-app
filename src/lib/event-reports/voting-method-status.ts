import { loadEventVotingControl } from "@/lib/judging/event-voting-control";
import type { EventReportVotingSetup } from "@/lib/event-reports/report-types";

export type {
  EventVotingMethodId,
  ReportVotingMethodStatus,
} from "@/lib/event-reports/voting-method-status-shared";

export {
  ballotVotingReportStatus,
  configureVotingStatusLabel,
  isVotingMethodEnabledForEvent,
  methodVotingReportStatus,
  publicVotingReportStatus,
  reportVotingStatusLabel,
  scoreSheetReportStatus,
} from "@/lib/event-reports/voting-method-status-shared";

import {
  ballotVotingReportStatus,
  publicVotingReportStatus,
  scoreSheetReportStatus,
} from "@/lib/event-reports/voting-method-status-shared";

import type { ReportVotingMethodStatus } from "@/lib/event-reports/voting-method-status-shared";

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
