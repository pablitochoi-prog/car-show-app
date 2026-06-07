import { cn } from "@/lib/utils";
import type { PublicVotingPeriodStatus } from "@/lib/vehicle-voting-types";

const STATUS_STYLES: Record<PublicVotingPeriodStatus, string> = {
  not_started: "border-border bg-muted/40 text-muted-foreground",
  open: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  ended: "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200",
};

export function publicVotingPeriodLabel(
  status: PublicVotingPeriodStatus,
): string {
  switch (status) {
    case "not_started":
      return "Voting not started";
    case "open":
      return "Voting open";
    case "ended":
      return "Voting period ended";
  }
}

export function PublicVotingPeriodStatusTag({
  status,
}: {
  status: PublicVotingPeriodStatus;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
      )}
      role="status"
    >
      {publicVotingPeriodLabel(status)}
    </span>
  );
}
