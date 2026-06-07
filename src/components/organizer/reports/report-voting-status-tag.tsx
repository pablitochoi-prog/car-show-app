import type { ReportVotingMethodStatus } from "@/lib/event-reports/voting-method-status";
import { reportVotingStatusLabel } from "@/lib/event-reports/voting-method-status";
import { cn } from "@/lib/utils";

type Props = {
  status: ReportVotingMethodStatus;
};

const STATUS_STYLES: Record<ReportVotingMethodStatus, string> = {
  not_started: "border-border bg-muted/40 text-muted-foreground",
  open: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  closed: "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200",
};

export function ReportVotingStatusTag({ status }: Props) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium print:hidden",
        STATUS_STYLES[status],
      )}
      role="status"
    >
      {reportVotingStatusLabel(status)}
    </span>
  );
}
