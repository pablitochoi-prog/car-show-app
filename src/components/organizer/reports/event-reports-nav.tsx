"use client";

import { cn } from "@/lib/utils";
import {
  PendingLink,
  PendingNavSpinner,
  usePendingNav,
} from "@/components/navigation/pending-navigation";
import {
  EVENT_REPORT_TYPES,
  type EventReportTypeId,
} from "@/lib/event-reports/report-types";

type Props = {
  eventId: string;
  activeReport: EventReportTypeId;
};

const tabClassName =
  "flex min-w-0 flex-1 items-center justify-center rounded-md px-2 py-2 text-center text-sm transition-colors";

export function EventReportsNav({ eventId, activeReport }: Props) {
  return (
    <nav
      className="flex gap-2 overflow-x-auto rounded-lg border bg-card p-2"
      aria-label="Report types"
    >
      {EVENT_REPORT_TYPES.map((report) => {
        const isActive = report.id === activeReport;

        if (!report.available) {
          return (
            <div
              key={report.id}
              className={cn(
                tabClassName,
                "flex-col gap-0.5 border border-dashed opacity-50",
              )}
              aria-disabled="true"
              title="Coming soon"
            >
              <span className="font-medium leading-tight">{report.label}</span>
              <span className="text-xs leading-tight text-muted-foreground">
                Coming soon
              </span>
            </div>
          );
        }

        const href = `/organizer/events/${eventId}/reports?report=${report.id}`;

        return (
          <PendingLink
            key={report.id}
            href={href}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              tabClassName,
              isActive
                ? "bg-primary font-medium text-primary-foreground"
                : "border border-border bg-background font-medium hover:bg-muted",
            )}
          >
            <ReportTabLabel label={report.label} />
          </PendingLink>
        );
      })}
    </nav>
  );
}

function ReportTabLabel({ label }: { label: string }) {
  const navigating = usePendingNav();

  return (
    <span className="flex items-center justify-center gap-1.5 leading-tight">
      {navigating && <PendingNavSpinner className="size-3.5" />}
      {label}
    </span>
  );
}
