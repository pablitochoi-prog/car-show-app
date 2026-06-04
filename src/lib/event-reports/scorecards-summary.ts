import { prisma } from "@/lib/db";
import { aggregateScoreSheetResults } from "@/lib/judging/score-sheet-results";

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
  totalDraft: number;
  totalSubmitted: number;
  totalFinalized: number;
  totalSheets: number;
  classes: ScorecardClassSummaryRow[];
  resultsPageHref: string;
};

export async function loadScorecardsSummaryReport(
  eventId: string,
): Promise<ScorecardsSummaryReport> {
  const classes = await prisma.eventJudgingClass.findMany({
    where: { eventId, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      template: { select: { name: true } },
    },
  });

  let totalDraft = 0;
  let totalSubmitted = 0;
  let totalFinalized = 0;
  let totalSheets = 0;

  const classRows: ScorecardClassSummaryRow[] = [];

  for (const cls of classes) {
    const results = await aggregateScoreSheetResults(eventId, cls.id, {
      includeOwnerNames: false,
    });
    if (!results) continue;
    const summary = results.summary;
    totalDraft += summary.draftSheetCount;
    totalSubmitted += summary.submittedSheetCount;
    totalFinalized += summary.finalizedSheetCount;
    totalSheets +=
      summary.draftSheetCount +
      summary.submittedSheetCount +
      summary.finalizedSheetCount;

    const top = results.ranked[0];
    classRows.push({
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
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    totalDraft,
    totalSubmitted,
    totalFinalized,
    totalSheets,
    classes: classRows,
    resultsPageHref: `/organizer/events/${eventId}/awards-judging/score-sheets/results`,
  };
}
