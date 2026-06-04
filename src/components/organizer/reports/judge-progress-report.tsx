import type { JudgeProgressReport } from "@/lib/event-reports/judge-progress";
import { ReportEmptyState } from "@/components/organizer/reports/report-empty-state";

type Props = {
  data: JudgeProgressReport;
};

export function JudgeProgressReportView({ data }: Props) {
  const { summary } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Total judges" value={String(summary.totalJudges)} />
        <MetricCard
          label="Score sheets assigned"
          value={String(summary.totalScoreSheets)}
        />
        <MetricCard
          label="Submitted"
          value={String(summary.submittedScoreSheets)}
        />
        <MetricCard label="In progress (draft)" value={String(summary.draftScoreSheets)} />
        <MetricCard
          label="Overall completion"
          value={summary.overallCompletionPercent}
        />
      </div>

      {data.rows.length === 0 ? (
        <ReportEmptyState message="No judges are assigned to this event yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="px-2 py-2 font-medium">Judge</th>
                <th className="px-2 py-2 font-medium">Classes</th>
                <th className="px-2 py-2 text-right font-medium">Sheets</th>
                <th className="px-2 py-2 text-right font-medium">Draft</th>
                <th className="px-2 py-2 text-right font-medium">Done</th>
                <th className="px-2 py-2 text-right font-medium">Ballot left</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.rows.map((row) => (
                <tr key={row.judgeEmail}>
                  <td className="px-2 py-2">
                    <span className="font-medium">{row.judgeName}</span>
                    <span className="block text-xs text-muted-foreground">
                      {row.judgeEmail}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs">{row.assignedClasses}</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {row.scoreSheetsAssigned}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {row.scoreSheetsDraft}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {row.completionPercent}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {row.ballotVotesRemaining}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );
}
