import Link from "next/link";
import { Download, Printer } from "lucide-react";
import {
  EVENT_REPORT_GROUPS,
  getReportsHomeSummary,
  reportsByGroup,
  reportsForHomeCardsForEvent,
  type EventReportDefinition,
  type EventReportVotingSetup,
} from "@/lib/event-reports/report-types";

type Props = {
  eventId: string;
  votingSetup: EventReportVotingSetup;
};

function ReportCapabilityBadges({ report }: { report: EventReportDefinition }) {
  if (report.comingSoon) {
    return (
      <span className="inline-flex items-center rounded-full border border-dashed px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
        Coming soon
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {report.supportsCsv ? (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
          <Download className="size-3" aria-hidden />
          CSV
        </span>
      ) : null}
      {report.supportsPrint ? (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
          <Printer className="size-3" aria-hidden />
          Print
        </span>
      ) : null}
    </div>
  );
}

function ReportCard({
  eventId,
  report,
}: {
  eventId: string;
  report: EventReportDefinition;
}) {
  const href = `/organizer/events/${eventId}/reports?report=${report.id}`;
  const isComingSoon = report.comingSoon || !report.available;

  if (isComingSoon) {
    return (
      <Link
        href={href}
        className="flex h-full flex-col rounded-lg border border-dashed bg-muted/20 p-4 opacity-90 transition-colors hover:border-muted-foreground/40 hover:bg-muted/30"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium">{report.label}</h3>
          <ReportCapabilityBadges report={report} />
        </div>
        <p className="mt-2 flex-1 text-sm text-muted-foreground">
          {report.description}
        </p>
        {report.comingSoonNote ? (
          <p className="mt-2 text-xs text-muted-foreground">{report.comingSoonNote}</p>
        ) : null}
        <span className="mt-3 text-sm font-medium text-muted-foreground">
          Learn more →
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="flex h-full flex-col rounded-lg border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium">{report.label}</h3>
        <ReportCapabilityBadges report={report} />
      </div>
      <p className="mt-2 flex-1 text-sm text-muted-foreground">
        {report.description}
      </p>
      <span className="mt-3 text-sm font-medium text-primary">View report →</span>
    </Link>
  );
}

export function EventReportsHome({ eventId, votingSetup }: Props) {
  const visibleReports = reportsForHomeCardsForEvent(votingSetup);
  const visibleIds = new Set(visibleReports.map((r) => r.id));
  const summary = getReportsHomeSummary(visibleReports);

  return (
    <div className="space-y-8">
      <div className="space-y-3 rounded-lg border bg-muted/15 p-4">
        <p className="text-sm text-muted-foreground">
          Event reports summarize registrations, payments, voting, judging, awards,
          and staffing using data already in CarShowScout. Sensitive registrant
          contact details are only visible to authorized organizers for this
          event.
        </p>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Available now
            </dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">
              {summary.available}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Coming soon
            </dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">
              {summary.comingSoon}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              CSV exports
            </dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">
              {summary.withCsv}
            </dd>
          </div>
        </dl>
      </div>

      {EVENT_REPORT_GROUPS.map((group) => {
        const cards = reportsByGroup(group.id).filter((r) =>
          visibleIds.has(r.id),
        );
        if (cards.length === 0) return null;
        return (
          <section key={group.id} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((report) => (
                <ReportCard key={report.id} eventId={eventId} report={report} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
