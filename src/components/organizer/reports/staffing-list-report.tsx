import type { StaffingListReport } from "@/lib/event-reports/staffing-list";
import { ReportEmptyState } from "@/components/organizer/reports/report-empty-state";

type Props = {
  data: StaffingListReport;
};

export function StaffingListReport({ data }: Props) {
  if (data.rows.length === 0) {
    return <ReportEmptyState message="No staff members are assigned to this event yet." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Email</th>
            <th className="px-3 py-2 font-medium">Roles</th>
            <th className="px-3 py-2 font-medium">Judging classes</th>
            <th className="px-3 py-2 font-medium">Ballot categories</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.rows.map((row) => (
            <tr key={row.email}>
              <td className="px-3 py-2 font-medium">{row.name}</td>
              <td className="px-3 py-2 text-xs">{row.email}</td>
              <td className="px-3 py-2">{row.roles}</td>
              <td className="px-3 py-2 text-xs">{row.judgingClasses}</td>
              <td className="px-3 py-2 text-xs">{row.ballotCategories}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
