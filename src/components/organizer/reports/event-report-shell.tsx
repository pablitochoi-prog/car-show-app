import type { ReactNode } from "react";
import { formatReportGeneratedAt } from "@/lib/event-reports/format";
import type { EventReportDefinition } from "@/lib/event-reports/report-types";
import type { ReportVotingMethodStatus } from "@/lib/event-reports/voting-method-status";
import { ReportToolbar } from "@/components/organizer/reports/report-toolbar";
import { ReportVotingStatusTag } from "@/components/organizer/reports/report-voting-status-tag";

type Props = {
  eventId: string;
  report: EventReportDefinition;
  generatedAt?: string;
  votingStatus?: ReportVotingMethodStatus;
  children: ReactNode;
};

export function EventReportShell({
  eventId,
  report,
  generatedAt,
  votingStatus,
  children,
}: Props) {
  const showToolbar =
    report.id !== "home" && (!!report.supportsCsv || !!report.supportsPrint);

  return (
    <main
      id="report-content"
      className="min-h-[16rem] rounded-lg border bg-card p-4 shadow-sm sm:p-6 print:border-0 print:shadow-none"
    >
      <div className="mb-3 space-y-1 border-b pb-3 print:border-b-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{report.label}</h2>
            {votingStatus ? <ReportVotingStatusTag status={votingStatus} /> : null}
          </div>
          {showToolbar ? (
            <ReportToolbar eventId={eventId} report={report} />
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{report.description}</p>
        {generatedAt ? (
          <p className="text-xs text-muted-foreground">
            Updated {formatReportGeneratedAt(generatedAt)}
          </p>
        ) : null}
      </div>
      {children}
    </main>
  );
}
