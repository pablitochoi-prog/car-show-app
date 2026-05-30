import type { EventVotingTabulation } from "@/lib/event-reports/voting-tabulation";

type Props = {
  data: EventVotingTabulation;
};

function formatGeneratedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function VotingTabulationReport({ data }: Props) {
  const hasAnyVotes = data.categories.some((c) => c.totalVotes > 0);

  if (data.categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No voting categories are configured for this event yet. Set them up under
        Edit Event → SMS Voting.
      </p>
    );
  }

  if (!hasAnyVotes) {
    return (
      <p className="text-sm text-muted-foreground">
        No votes have been recorded yet for this event.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Combined website and SMS votes, ranked by total per category. Updated{" "}
        {formatGeneratedAt(data.generatedAt)}.
      </p>

      {data.categories.map((category) => (
        <section key={category.categoryId} className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">{category.categoryName}</h2>
            <p className="text-sm text-muted-foreground">
              {category.totalVotes} total vote
              {category.totalVotes === 1 ? "" : "s"} · {category.totalWebVotes}{" "}
              web · {category.totalSmsVotes} SMS
            </p>
          </div>

          {category.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No votes in this category yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[32rem] text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Rank</th>
                    <th className="px-3 py-2.5 font-medium">Vehicle ID</th>
                    <th className="px-3 py-2.5 font-medium">Vehicle</th>
                    <th className="px-3 py-2.5 text-right font-medium">Web</th>
                    <th className="px-3 py-2.5 text-right font-medium">SMS</th>
                    <th className="px-3 py-2.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {category.rows.map((row) => (
                    <tr key={row.vehicleEntryCode} className="hover:bg-muted/20">
                      <td className="px-3 py-2.5 tabular-nums">{row.rank}</td>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {row.vehicleEntryCode}
                      </td>
                      <td className="px-3 py-2.5">{row.vehicleLabel}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {row.webVotes}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {row.smsVotes}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                        {row.totalVotes}
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
