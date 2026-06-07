"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, Printer } from "lucide-react";
import {
  buildReportCsvHref,
  reportSupportsCsvExport,
  type EventReportDefinition,
} from "@/lib/event-reports/report-types";

type Props = {
  eventId: string;
  report: Pick<EventReportDefinition, "id" | "label" | "supportsCsv" | "supportsPrint">;
};

export function ReportToolbar({ eventId, report }: Props) {
  const csvHref = reportSupportsCsvExport(report)
    ? buildReportCsvHref(eventId, report.id)
    : null;

  if (!csvHref && !report.supportsPrint) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {csvHref ? (
        <a
          href={csvHref}
          download
          aria-label={`Export ${report.label} as CSV`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
        >
          <Download className="size-3.5" aria-hidden />
          Export CSV
        </a>
      ) : null}
      {report.supportsPrint ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.print()}
        >
          <Printer className="size-3.5" aria-hidden />
          Print
        </Button>
      ) : null}
    </div>
  );
}
