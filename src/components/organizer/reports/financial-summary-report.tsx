import type { FinancialSummaryReport } from "@/lib/event-reports/financial-summary";
import { formatCents } from "@/lib/event-reports/format";
import { ReportEmptyState } from "@/components/organizer/reports/report-empty-state";

type Props = {
  data: FinancialSummaryReport;
};

export function FinancialSummaryReport({ data }: Props) {
  const totalRegs = data.metrics.find((m) => m.label === "Total registrations")
    ?.value;

  if (totalRegs === "0") {
    return (
      <ReportEmptyState message="No registrations yet. Financial metrics will appear once people register for this event." />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {data.metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-lg border bg-muted/20 px-3 py-2.5"
          >
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{m.value}</p>
            {m.note ? (
              <p className="mt-1 text-xs text-muted-foreground">{m.note}</p>
            ) : null}
          </div>
        ))}
      </div>

      {data.revenueByTier.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Revenue by registration tier</h3>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[20rem] text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Tier</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Registrations
                  </th>
                  <th className="px-3 py-2 text-right font-medium">Gross</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.revenueByTier.map((row) => (
                  <tr key={row.tierName}>
                    <td className="px-3 py-2">{row.tierName}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.registrationCount}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCents(row.grossCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
