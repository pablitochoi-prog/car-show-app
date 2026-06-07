import { Loader2 } from "lucide-react";
import type { EventReportDefinition } from "@/lib/event-reports/report-types";
import { EventReportShell } from "@/components/organizer/reports/event-report-shell";

export function ReportContentLoading({
  eventId,
  report,
}: {
  eventId: string;
  report: EventReportDefinition;
}) {
  return (
    <EventReportShell eventId={eventId} report={report}>
      <div
        className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="size-8 animate-spin" aria-hidden />
        <p className="text-sm">Loading {report.label}…</p>
      </div>
    </EventReportShell>
  );
}
