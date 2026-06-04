import Link from "next/link";
import type { RegistrationDetailReport } from "@/lib/event-reports/registration-detail";
import { ReportEmptyState } from "@/components/organizer/reports/report-empty-state";

type Props = {
  eventId: string;
  data: RegistrationDetailReport;
};

export function RegistrationDetailReport({ eventId, data }: Props) {
  if (data.totalRows === 0) {
    return (
      <ReportEmptyState message="No registrations match your search for this event." />
    );
  }

  const base = `/organizer/events/${eventId}/reports?report=registrations`;
  const q = data.search ? `&q=${encodeURIComponent(data.search)}` : "";

  return (
    <div className="space-y-4">
      <form method="get" className="flex flex-wrap gap-2 print:hidden">
        <input type="hidden" name="report" value="registrations" />
        <input
          name="q"
          defaultValue={data.search}
          placeholder="Search name, email, vehicle ID…"
          className="h-9 min-w-[12rem] flex-1 rounded-md border bg-background px-3 text-sm"
        />
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
        >
          Search
        </button>
      </form>

      <p className="text-sm text-muted-foreground">
        {data.totalRows} row{data.totalRows === 1 ? "" : "s"} · page {data.page}{" "}
        of {data.totalPages}
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-2 py-2 font-medium">Registrant</th>
              <th className="px-2 py-2 font-medium">Email</th>
              <th className="px-2 py-2 font-medium">Vehicle ID</th>
              <th className="px-2 py-2 font-medium">Vehicle</th>
              <th className="px-2 py-2 font-medium">Class</th>
              <th className="px-2 py-2 font-medium">Tier</th>
              <th className="px-2 py-2 font-medium">Payment</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.rows.map((row, i) => (
              <tr key={`${row.registrationId}-${row.vehicleEntryCode}-${i}`}>
                <td className="px-2 py-2">{row.registrantName}</td>
                <td className="px-2 py-2 text-xs">{row.email}</td>
                <td className="px-2 py-2 font-mono text-xs">
                  {row.vehicleEntryCode || "—"}
                </td>
                <td className="px-2 py-2">
                  {[row.year, row.make, row.model].filter(Boolean).join(" ")}
                </td>
                <td className="px-2 py-2">{row.vehicleClass || "—"}</td>
                <td className="px-2 py-2">{row.tierName}</td>
                <td className="px-2 py-2">
                  {row.paymentStatus} · {row.amountPaid}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 ? (
        <div className="flex flex-wrap gap-2 print:hidden">
          {data.page > 1 ? (
            <Link
              href={`${base}&page=${data.page - 1}${q}`}
              className="text-sm text-primary underline"
            >
              ← Previous
            </Link>
          ) : null}
          {data.page < data.totalPages ? (
            <Link
              href={`${base}&page=${data.page + 1}${q}`}
              className="text-sm text-primary underline"
            >
              Next →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
