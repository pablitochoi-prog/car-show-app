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
              className="shrink-0 rounded-md border border-dashed px-3 py-2 text-sm opacity-50"
              aria-disabled="true"
              title="Coming soon"
            >
              <span className="font-medium whitespace-nowrap">{report.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
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
              "min-w-[9rem] shrink-0 rounded-md px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background hover:bg-muted",
            )}
          >
            <ReportTabLabel
              label={report.label}
              description={report.description}
              isActive={isActive}
            />
          </PendingLink>
        );
      })}
    </nav>
  );
}

function ReportTabLabel({
  label,
  description,
  isActive,
}: {
  label: string;
  description: string;
  isActive: boolean;
}) {
  const navigating = usePendingNav();

  return (
    <>
      <span className="flex items-center gap-1.5 font-medium whitespace-nowrap">
        {navigating && <PendingNavSpinner className="size-3.5" />}
        {label}
      </span>
      <span
        className={cn(
          "mt-0.5 block text-xs leading-snug",
          isActive ? "text-primary-foreground/85" : "text-muted-foreground",
        )}
      >
        {description}
      </span>
    </>
  );
}
