"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  navigableReportTypesForEvent,
  normalizeReportParam,
  type EventReportTypeId,
  type EventReportVotingSetup,
} from "@/lib/event-reports/report-types";

type Props = {
  eventId: string;
  activeReport: EventReportTypeId;
  votingSetup: EventReportVotingSetup;
};

function tabClassName(isActive: boolean, isPending: boolean): string {
  return cn(
    "relative flex min-h-10 flex-col items-center justify-center rounded-md px-1 py-1.5 text-center text-[0.7rem] leading-snug font-medium transition-colors sm:text-xs",
    isPending && "pointer-events-none opacity-70",
    isActive
      ? "bg-primary text-primary-foreground"
      : "border border-border bg-background hover:bg-muted",
  );
}

export function EventReportsNav({
  eventId,
  activeReport,
  votingSetup,
}: Props) {
  const searchParams = useSearchParams();
  const tabs = navigableReportTypesForEvent(votingSetup);
  const [pendingReportId, setPendingReportId] = useState<EventReportTypeId | null>(
    null,
  );

  const reportFromUrl = normalizeReportParam(
    searchParams.get("report") ?? undefined,
  );

  useEffect(() => {
    if (pendingReportId && activeReport === pendingReportId) {
      setPendingReportId(null);
    }
  }, [activeReport, pendingReportId]);

  useEffect(() => {
    if (pendingReportId && reportFromUrl === pendingReportId) {
      setPendingReportId(null);
    }
  }, [pendingReportId, reportFromUrl]);

  const beginNavigation = useCallback(
    (reportId: EventReportTypeId) => {
      if (reportId !== activeReport) {
        setPendingReportId(reportId);
      }
    },
    [activeReport],
  );

  const pendingLabel =
    pendingReportId === "home"
      ? "All reports"
      : tabs.find((tab) => tab.id === pendingReportId)?.label;

  return (
    <div className="space-y-2">
      <nav
        className="grid gap-1.5 rounded-lg border bg-card p-1.5 [grid-template-columns:repeat(auto-fit,minmax(6.5rem,1fr))]"
        aria-label="Report types"
      >
        <Link
          href={`/organizer/events/${eventId}/reports?report=home`}
          prefetch
          scroll={false}
          aria-current={activeReport === "home" ? "page" : undefined}
          aria-busy={pendingReportId === "home" || undefined}
          onClick={() => beginNavigation("home")}
          className={tabClassName(
            activeReport === "home",
            pendingReportId === "home",
          )}
        >
          {pendingReportId === "home" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            "All"
          )}
        </Link>
        {tabs.map((report) => {
          const isActive = report.id === activeReport;
          const isPending = pendingReportId === report.id;
          const href = `/organizer/events/${eventId}/reports?report=${report.id}`;

          if (report.comingSoon) {
            return (
              <Link
                key={report.id}
                href={href}
                prefetch
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                aria-busy={isPending || undefined}
                title={report.comingSoonNote ?? "Coming soon"}
                onClick={() => beginNavigation(report.id)}
                className={cn(
                  "relative flex min-h-10 flex-col items-center justify-center rounded-md border border-dashed px-1 py-1.5 text-center text-[0.65rem] leading-snug",
                  isPending && "pointer-events-none opacity-70",
                  isActive
                    ? "border-primary/50 bg-muted text-foreground"
                    : "opacity-80 hover:bg-muted/50",
                )}
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <>
                    <span>{report.label}</span>
                    <span className="text-[0.6rem] text-muted-foreground">
                      Soon
                    </span>
                  </>
                )}
              </Link>
            );
          }

          return (
            <Link
              key={report.id}
              href={href}
              prefetch
              scroll={false}
              aria-current={isActive ? "page" : undefined}
              aria-busy={isPending || undefined}
              onClick={() => beginNavigation(report.id)}
              className={tabClassName(isActive, isPending)}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                report.label
              )}
            </Link>
          );
        })}
      </nav>

      {pendingReportId ? (
        <p
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          Loading {pendingLabel ?? "report"}…
        </p>
      ) : null}
    </div>
  );
}
