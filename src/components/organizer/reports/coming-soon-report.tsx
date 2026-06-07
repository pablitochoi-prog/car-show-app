import type { EventReportDefinition } from "@/lib/event-reports/report-types";

type Props = {
  report: EventReportDefinition;
};

export function ComingSoonReport({ report }: Props) {
  return (
    <div className="space-y-3 rounded-md border border-dashed bg-muted/20 p-6">
      <p className="text-sm font-medium">Coming soon</p>
      <p className="text-sm text-muted-foreground">{report.description}</p>
      {report.comingSoonNote ? (
        <p className="text-sm text-muted-foreground">{report.comingSoonNote}</p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        This report will use existing registration and event data once the
        required fields are added in a future release.
      </p>
    </div>
  );
}
