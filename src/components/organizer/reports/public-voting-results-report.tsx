import Link from "next/link";
import type { PublicVotingResultsReport } from "@/lib/event-reports/public-voting-results";
import {
  REPORT_EMPTY_MESSAGES,
  reportHasRankedRows,
} from "@/lib/event-reports/report-types";
import { ReportEmptyState } from "@/components/organizer/reports/report-empty-state";

type Props = {
  eventId: string;
  data: PublicVotingResultsReport;
};

export function PublicVotingResultsReport({ eventId, data }: Props) {
  const hasVotes = reportHasRankedRows(data.categories);
  const base = `/organizer/events/${eventId}/reports?report=public-voting`;

  return (
    <div className="space-y-6">
      {data.categories.length === 0 ? (
        <ReportEmptyState
          message={REPORT_EMPTY_MESSAGES.publicVotingNoCategories}
        />
      ) : !hasVotes ? (
        <ReportEmptyState message={REPORT_EMPTY_MESSAGES.publicVotingNoVotes} />
      ) : (
        <div className="space-y-8">
      {!data.showAll ? (
        <p className="text-sm text-muted-foreground">
          Showing top {data.categories[0]?.topN ?? 25} per category.{" "}
          <Link href={`${base}&showAll=1`} className="text-primary underline">
            View all vehicles
          </Link>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Showing all ranked vehicles.{" "}
          <Link href={base} className="text-primary underline">
            Show top 25 only
          </Link>
        </p>
      )}

      {data.categories.map((cat) => (
        <section key={cat.categoryId} className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">{cat.categoryName}</h3>
            <span className="text-sm text-muted-foreground">
              {cat.totalVotes} vote{cat.totalVotes === 1 ? "" : "s"}
              {cat.totalRanked > cat.totalShown
                ? ` · showing ${cat.totalShown} of ${cat.totalRanked}`
                : ""}
            </span>
          </div>
          {cat.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No votes in this category.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[40rem] text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-2 py-2 font-medium">Rank</th>
                    <th className="px-2 py-2 font-medium">Vehicle ID</th>
                    <th className="px-2 py-2 font-medium">Vehicle</th>
                    <th className="px-2 py-2 font-medium">Owner</th>
                    <th className="px-2 py-2 font-medium">Class</th>
                    <th className="px-2 py-2 text-right font-medium">Votes</th>
                    <th className="px-2 py-2 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cat.rows.map((row) => (
                    <tr key={row.vehicleEntryCode}>
                      <td className="px-2 py-2 tabular-nums">
                        {row.rank}
                        {row.isTied ? (
                          <span className="ml-1 text-xs text-amber-600">tie</span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 font-mono text-xs">
                        {row.vehicleEntryCode}
                      </td>
                      <td className="px-2 py-2">
                        {[row.year, row.make, row.model].filter(Boolean).join(" ")}
                      </td>
                      <td className="px-2 py-2">{row.ownerName || "—"}</td>
                      <td className="px-2 py-2">{row.vehicleClass || "—"}</td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {row.totalVotes}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {row.percentOfCategory}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
        </div>
      )}
    </div>
  );
}
