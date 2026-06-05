import type { EventReportDefinition } from "@/lib/event-reports/report-types";

type Props = {
  report: EventReportDefinition;
};

export function ComingSoonReport({ report }: Props) {
  return (
    <div className="space-y-2 rounded-md border border-dashed bg-muted/20 p-6">
      <p className="text-sm font-medium">Coming soon</p>
      <p className="text-sm text-muted-foreground">
        {report.comingSoonNote ?? report.description}
      </p>
    </div>
  );
}
