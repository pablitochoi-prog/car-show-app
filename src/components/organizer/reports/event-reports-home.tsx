import Link from "next/link";
import {
  EVENT_REPORT_GROUPS,
  reportsByGroup,
  type EventReportDefinition,
} from "@/lib/event-reports/report-types";

type Props = {
  eventId: string;
};

function ReportCard({
  eventId,
  report,
}: {
  eventId: string;
  report: EventReportDefinition;
}) {
  const href = `/organizer/events/${eventId}/reports?report=${report.id}`;
  const disabled = report.comingSoon || !report.available;

  if (disabled) {
    return (
      <div className="flex h-full flex-col rounded-lg border border-dashed bg-muted/20 p-4 opacity-80">
        <h3 className="font-medium">{report.label}</h3>
        <p className="mt-1 flex-1 text-sm text-muted-foreground">
          {report.comingSoonNote ?? report.description}
        </p>
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          Coming soon
        </p>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="flex h-full flex-col rounded-lg border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <h3 className="font-medium">{report.label}</h3>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">
        {report.description}
      </p>
      <span className="mt-3 text-sm font-medium text-primary">View report →</span>
    </Link>
  );
}

export function EventReportsHome({ eventId }: Props) {
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Choose a report below. Sensitive registrant data is only visible to
        authorized organizers for this event.
      </p>
      {EVENT_REPORT_GROUPS.map((group) => {
        const cards = reportsByGroup(group.id);
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
