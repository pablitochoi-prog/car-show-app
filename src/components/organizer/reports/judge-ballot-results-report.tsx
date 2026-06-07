import Link from "next/link";
import type { JudgeBallotResultsReport } from "@/lib/event-reports/judge-ballot-results";
import {
  REPORT_EMPTY_MESSAGES,
  reportHasRankedRows,
} from "@/lib/event-reports/report-types";
import { ReportEmptyState } from "@/components/organizer/reports/report-empty-state";

type Props = {
  eventId: string;
  data: JudgeBallotResultsReport;
};

export function JudgeBallotResultsReport({ eventId, data }: Props) {
  if (data.categories.length === 0) {
    return (
      <ReportEmptyState message={REPORT_EMPTY_MESSAGES.judgeBallotNoCategories} />
    );
  }

  if (!reportHasRankedRows(data.categories)) {
    return (
      <ReportEmptyState message={REPORT_EMPTY_MESSAGES.judgeBallotNoVotes} />
    );
  }

  const base = `/organizer/events/${eventId}/reports?report=judge-ballots`;

  return (
    <div className="space-y-8">
      {!data.showAll ? (
        <p className="text-sm text-muted-foreground">
          Showing top {data.categories[0]?.topN ?? 25} per category.{" "}
          <Link href={`${base}&showAll=1`} className="text-primary underline">
            View all
          </Link>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link href={base} className="text-primary underline">
            Show top 25 only
          </Link>
        </p>
      )}

      {data.categories.map((cat) => (
        <section key={cat.categoryId} className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">
              {cat.categoryName}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ({cat.status})
              </span>
            </h3>
          </div>
          {cat.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ballot votes yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-2 py-2 font-medium">Rank</th>
                    <th className="px-2 py-2 font-medium">Vehicle ID</th>
                    <th className="px-2 py-2 font-medium">Vehicle</th>
                    <th className="px-2 py-2 font-medium">Owner</th>
                    <th className="px-2 py-2 text-right font-medium">Votes</th>
                    <th className="px-2 py-2 text-right font-medium">Judges</th>
                    <th className="px-2 py-2 text-right font-medium">Avg</th>
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
                      <td className="px-2 py-2 text-right tabular-nums">
                        {row.totalVotes}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {row.judgeCount}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {row.avgVotesPerJudge}
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
  );
}
