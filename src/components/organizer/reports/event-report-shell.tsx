import type { ReactNode } from "react";
import { formatReportGeneratedAt } from "@/lib/event-reports/format";
import type { EventReportDefinition } from "@/lib/event-reports/report-types";
import { ReportToolbar } from "@/components/organizer/reports/report-toolbar";

type Props = {
  eventId: string;
  report: EventReportDefinition;
  generatedAt?: string;
  children: ReactNode;
};

export function EventReportShell({
  eventId,
  report,
  generatedAt,
  children,
}: Props) {
  const showToolbar =
    report.id !== "home" && (report.supportsCsv || report.supportsPrint);

  return (
    <main
      id="report-content"
      className="min-h-[16rem] rounded-lg border bg-card p-4 shadow-sm sm:p-6 print:border-0 print:shadow-none"
    >
      <div className="mb-4 flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-start sm:justify-between print:border-b-2">
        <div>
          <h2 className="text-lg font-semibold">{report.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.description}
          </p>
          {generatedAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Updated {formatReportGeneratedAt(generatedAt)}
            </p>
          ) : null}
        </div>
        {showToolbar ? (
          <ReportToolbar
            eventId={eventId}
            reportId={report.id}
            supportsCsv={report.supportsCsv}
            supportsPrint={report.supportsPrint}
          />
        ) : null}
      </div>
      {children}
    </main>
  );
}
