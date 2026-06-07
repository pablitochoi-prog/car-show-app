import { notFound } from "next/navigation";
import { FinancialSummaryReport } from "@/components/organizer/reports/financial-summary-report";
import { RegistrationDetailReport } from "@/components/organizer/reports/registration-detail-report";
import { StaffingListReport } from "@/components/organizer/reports/staffing-list-report";
import { PublicVotingResultsReport } from "@/components/organizer/reports/public-voting-results-report";
import { JudgeBallotResultsReport } from "@/components/organizer/reports/judge-ballot-results-report";
import { AwardsWinnersReportView } from "@/components/organizer/reports/awards-winners-report";
import { JudgeProgressReportView } from "@/components/organizer/reports/judge-progress-report";
import { ScorecardsSummaryReportView } from "@/components/organizer/reports/scorecards-summary-report";
import { EventReportShell } from "@/components/organizer/reports/event-report-shell";
import { loadFinancialSummaryReport } from "@/lib/event-reports/financial-summary";
import { loadRegistrationDetailReport } from "@/lib/event-reports/registration-detail";
import { loadStaffingListReport } from "@/lib/event-reports/staffing-list";
import { loadPublicVotingResultsReport } from "@/lib/event-reports/public-voting-results";
import { loadJudgeBallotResultsReport } from "@/lib/event-reports/judge-ballot-results";
import { loadAwardsWinnersReport } from "@/lib/event-reports/awards-winners";
import { loadJudgeProgressReport } from "@/lib/event-reports/judge-progress";
import { loadScorecardsSummaryReport } from "@/lib/event-reports/scorecards-summary";
import type { EventReportDefinition } from "@/lib/event-reports/report-types";

type SearchParams = {
  q?: string;
  page?: string;
  showAll?: string;
};

export async function EventReportContent({
  eventId,
  report,
  searchParams,
}: {
  eventId: string;
  report: EventReportDefinition;
  searchParams: SearchParams;
}) {
  switch (report.id) {
    case "financial": {
      const data = await loadFinancialSummaryReport(eventId);
      return (
        <EventReportShell
          eventId={eventId}
          report={report}
          generatedAt={data.generatedAt}
        >
          <FinancialSummaryReport data={data} />
        </EventReportShell>
      );
    }
    case "registrations": {
      const page = parseInt(searchParams.page ?? "1", 10);
      const data = await loadRegistrationDetailReport(eventId, {
        search: searchParams.q,
        page: Number.isFinite(page) ? page : 1,
      });
      return (
        <EventReportShell
          eventId={eventId}
          report={report}
          generatedAt={data.generatedAt}
        >
          <RegistrationDetailReport eventId={eventId} data={data} />
        </EventReportShell>
      );
    }
    case "staffing": {
      const data = await loadStaffingListReport(eventId);
      return (
        <EventReportShell
          eventId={eventId}
          report={report}
          generatedAt={data.generatedAt}
        >
          <StaffingListReport data={data} />
        </EventReportShell>
      );
    }
    case "public-voting": {
      const data = await loadPublicVotingResultsReport(eventId, {
        showAll: searchParams.showAll === "1",
      });
      return (
        <EventReportShell
          eventId={eventId}
          report={report}
          generatedAt={data.generatedAt}
          votingStatus={data.votingStatus}
        >
          <PublicVotingResultsReport eventId={eventId} data={data} />
        </EventReportShell>
      );
    }
    case "judge-ballots": {
      const data = await loadJudgeBallotResultsReport(eventId, {
        showAll: searchParams.showAll === "1",
      });
      return (
        <EventReportShell
          eventId={eventId}
          report={report}
          generatedAt={data.generatedAt}
          votingStatus={data.votingStatus}
        >
          <JudgeBallotResultsReport eventId={eventId} data={data} />
        </EventReportShell>
      );
    }
    case "awards": {
      const data = await loadAwardsWinnersReport(eventId);
      if (!data) notFound();
      return (
        <EventReportShell
          eventId={eventId}
          report={report}
          generatedAt={data.generatedAt}
        >
          <AwardsWinnersReportView data={data} />
        </EventReportShell>
      );
    }
    case "judge-progress": {
      const data = await loadJudgeProgressReport(eventId);
      return (
        <EventReportShell
          eventId={eventId}
          report={report}
          generatedAt={data.generatedAt}
        >
          <JudgeProgressReportView data={data} />
        </EventReportShell>
      );
    }
    case "scorecards": {
      const data = await loadScorecardsSummaryReport(eventId);
      return (
        <EventReportShell
          eventId={eventId}
          report={report}
          generatedAt={data.generatedAt}
          votingStatus={data.votingStatus}
        >
          <ScorecardsSummaryReportView data={data} />
        </EventReportShell>
      );
    }
    default:
      return null;
  }
}
