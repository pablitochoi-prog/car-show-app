import { prisma } from "@/lib/db";
import { aggregateScoreSheetResults } from "@/lib/judging/score-sheet-results";
import { loadEventVotingControl } from "@/lib/judging/event-voting-control";
import {
  scoreSheetReportStatus,
  type ReportVotingMethodStatus,
} from "@/lib/event-reports/voting-method-status";

export type ScorecardClassSummaryRow = {
  judgingClassId: string;
  className: string;
  templateName: string;
  eligibleVehicles: number;
  rankedVehicles: number;
  draftSheets: number;
  submittedSheets: number;
  finalizedSheets: number;
  topVehicleEntryCode: string;
  topScore: string;
};

export type ScorecardsSummaryReport = {
  generatedAt: string;
  votingStatus: ReportVotingMethodStatus;
  totalDraft: number;
  totalSubmitted: number;
  totalFinalized: number;
  totalSheets: number;
  classes: ScorecardClassSummaryRow[];
  resultsPageHref: string;
  individualScoreSheetsHref: string;
  judgeScoreSheetsHref: string;
};

export async function loadScorecardsSummaryReport(
  eventId: string,
): Promise<ScorecardsSummaryReport> {
  const [classes, votingControl] = await Promise.all([
    prisma.eventJudgingClass.findMany({
    where: { eventId, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      template: { select: { name: true } },
    },
  }),
    loadEventVotingControl(eventId),
  ]);

  const votingStatus = votingControl
    ? scoreSheetReportStatus(votingControl.scoreSheet)
    : "not_started";

  const classRows = (
    await Promise.all(
      classes.map(async (cls) => {
        const results = await aggregateScoreSheetResults(eventId, cls.id, {
          includeOwnerNames: false,
        });
        if (!results) return null;
        const summary = results.summary;
        const top = results.ranked[0];
        return {
          judgingClassId: cls.id,
          className: cls.name,
          templateName: results.judgingClass.templateName,
          eligibleVehicles: summary.eligibleVehicleCount,
          rankedVehicles: summary.rankedVehicleCount,
          draftSheets: summary.draftSheetCount,
          submittedSheets: summary.submittedSheetCount,
          finalizedSheets: summary.finalizedSheetCount,
          topVehicleEntryCode: top?.vehicleEntryCode ?? "—",
          topScore:
            top?.officialScore != null ? String(top.officialScore) : "—",
        } satisfies ScorecardClassSummaryRow;
      }),
    )
  ).filter((row): row is ScorecardClassSummaryRow => row != null);

  let totalDraft = 0;
  let totalSubmitted = 0;
  let totalFinalized = 0;
  let totalSheets = 0;
  for (const row of classRows) {
    totalDraft += row.draftSheets;
    totalSubmitted += row.submittedSheets;
    totalFinalized += row.finalizedSheets;
    totalSheets += row.draftSheets + row.submittedSheets + row.finalizedSheets;
  }

  return {
    generatedAt: new Date().toISOString(),
    votingStatus,
    totalDraft,
    totalSubmitted,
    totalFinalized,
    totalSheets,
    classes: classRows,
    resultsPageHref: `/organizer/events/${eventId}/awards-judging/score-sheets/results`,
    individualScoreSheetsHref: `/organizer/events/${eventId}/awards-judging/score-sheets/results/individual`,
    judgeScoreSheetsHref: `/organizer/events/${eventId}/awards-judging/score-sheets/results/by-judge`,
  };
}
