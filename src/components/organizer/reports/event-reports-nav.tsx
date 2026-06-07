"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  navigableReportTypes,
  type EventReportTypeId,
} from "@/lib/event-reports/report-types";

type Props = {
  eventId: string;
  activeReport: EventReportTypeId;
};

export function EventReportsNav({ eventId, activeReport }: Props) {
  const tabs = navigableReportTypes();

  return (
    <nav
      className="grid gap-1.5 rounded-lg border bg-card p-1.5 [grid-template-columns:repeat(auto-fit,minmax(6.5rem,1fr))]"
      aria-label="Report types"
    >
      <Link
        href={`/organizer/events/${eventId}/reports?report=home`}
        scroll={false}
        aria-current={activeReport === "home" ? "page" : undefined}
        className={cn(
          "flex min-h-10 flex-col items-center justify-center rounded-md px-1 py-1.5 text-center text-[0.7rem] leading-snug font-medium transition-colors sm:text-xs",
          activeReport === "home"
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-background hover:bg-muted",
        )}
      >
        All
      </Link>
      {tabs.map((report) => {
        const isActive = report.id === activeReport;
        const href = `/organizer/events/${eventId}/reports?report=${report.id}`;

        if (report.comingSoon) {
          return (
            <Link
              key={report.id}
              href={href}
              scroll={false}
              aria-current={isActive ? "page" : undefined}
              title={report.comingSoonNote ?? "Coming soon"}
              className={cn(
                "flex min-h-10 flex-col items-center justify-center rounded-md border border-dashed px-1 py-1.5 text-center text-[0.65rem] leading-snug opacity-80",
                isActive
                  ? "border-primary/50 bg-muted text-foreground"
                  : "hover:bg-muted/50",
              )}
            >
              <span>{report.label}</span>
              <span className="text-[0.6rem] text-muted-foreground">Soon</span>
            </Link>
          );
        }

        return (
          <Link
            key={report.id}
            href={href}
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-10 flex-col items-center justify-center rounded-md px-1 py-1.5 text-center text-[0.7rem] leading-snug font-medium transition-colors sm:text-xs",
              isActive
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background hover:bg-muted",
            )}
          >
            {report.label}
          </Link>
        );
      })}
    </nav>
  );
}
