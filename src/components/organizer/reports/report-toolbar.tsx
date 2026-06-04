"use client";

import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import type { EventReportTypeId } from "@/lib/event-reports/report-types";
import { isCsvExportReportId } from "@/lib/event-reports/report-types";

type Props = {
  eventId: string;
  reportId: EventReportTypeId;
  supportsCsv?: boolean;
  supportsPrint?: boolean;
};

export function ReportToolbar({
  eventId,
  reportId,
  supportsCsv,
  supportsPrint,
}: Props) {
  const csvHref =
    supportsCsv && isCsvExportReportId(reportId)
      ? `/api/events/${eventId}/reports/${reportId}/csv`
      : null;

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {csvHref ? (
        <a
          href={csvHref}
          download
          className="inline-flex h-7 items-center gap-1 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
        >
          <Download className="size-3.5" aria-hidden />
          Export CSV
        </a>
      ) : null}
      {supportsPrint ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.print()}
        >
          <Printer className="mr-1 size-4" aria-hidden />
          Print
        </Button>
      ) : null}
    </div>
  );
}
