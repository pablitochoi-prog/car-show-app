import Link from "next/link";
import type { ReactNode } from "react";
import type { ScorecardsSummaryReport } from "@/lib/event-reports/scorecards-summary";
import { ReportEmptyState } from "@/components/organizer/reports/report-empty-state";

type Props = {
  data: ScorecardsSummaryReport;
};

export function ScorecardsSummaryReportView({ data }: Props) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        For line-by-line deductions and exports, use the full score sheet results
        workspace.
      </p>
      <ButtonLink href={data.resultsPageHref}>
        Open score sheet results →
      </ButtonLink>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Draft" value={data.totalDraft} />
        <Stat label="Submitted" value={data.totalSubmitted} />
        <Stat label="Finalized" value={data.totalFinalized} />
      </div>

      {data.classes.length === 0 ? (
        <ReportEmptyState message="No active judging classes are configured for this event." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="px-2 py-2 font-medium">Class</th>
                <th className="px-2 py-2 font-medium">Template</th>
                <th className="px-2 py-2 text-right font-medium">Draft</th>
                <th className="px-2 py-2 text-right font-medium">Submitted</th>
                <th className="px-2 py-2 text-right font-medium">Top vehicle</th>
                <th className="px-2 py-2 text-right font-medium">Top score</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.classes.map((row) => (
                <tr key={row.judgingClassId}>
                  <td className="px-2 py-2 font-medium">{row.className}</td>
                  <td className="px-2 py-2 text-xs">{row.templateName}</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {row.draftSheets}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {row.submittedSheets + row.finalizedSheets}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-xs">
                    {row.topVehicleEntryCode}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {row.topScore}
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function ButtonLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
    >
      {children}
    </Link>
  );
}
