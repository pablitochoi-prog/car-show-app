import type { AwardsWinnersReport } from "@/lib/event-reports/awards-winners";
import { ReportEmptyState } from "@/components/organizer/reports/report-empty-state";

type Props = {
  data: AwardsWinnersReport;
};

export function AwardsWinnersReportView({ data }: Props) {
  if (data.rows.length === 0) {
    return (
      <ReportEmptyState message="No award or trophy placements are configured for this event yet." />
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {data.isProjected ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          Projected / current results — awards voting is not finalized for this
          event yet.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Finalized award results
          {data.awardsFinalizedAt
            ? ` (${new Date(data.awardsFinalizedAt).toLocaleString()})`
            : ""}
          .
        </p>
      )}

      <section className="hidden rounded-lg border bg-muted/30 p-4 print:block">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">
          Announcer view
        </h3>
        <ul className="space-y-2 font-mono text-sm leading-relaxed">
          {data.announcerLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <details className="rounded-lg border bg-muted/20 p-3 print:hidden">
        <summary className="cursor-pointer text-sm font-medium">
          Announcer view (print-friendly)
        </summary>
        <ul className="mt-3 space-y-2 font-mono text-sm leading-relaxed">
          {data.announcerLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-2 py-2 font-medium">Award</th>
              <th className="px-2 py-2 font-medium">Place</th>
              <th className="px-2 py-2 font-medium">Vehicle ID</th>
              <th className="px-2 py-2 font-medium">Vehicle</th>
              <th className="px-2 py-2 font-medium">Owner</th>
              <th className="px-2 py-2 font-medium">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.rows.map((row, i) => (
              <tr key={`${row.awardCategory}-${row.placement}-${i}`}>
                <td className="px-2 py-2">{row.awardCategory}</td>
                <td className="px-2 py-2">{row.placement}</td>
                <td className="px-2 py-2 font-mono text-xs">
                  {row.vehicleEntryCode || "—"}
                </td>
                <td className="px-2 py-2">
                  {row.vehicleEntryCode
                    ? `${row.year} ${row.make} ${row.model}`.trim()
                    : "—"}
                </td>
                <td className="px-2 py-2">{row.ownerName || "—"}</td>
                <td className="px-2 py-2 text-xs">{row.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
