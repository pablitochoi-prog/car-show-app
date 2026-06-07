import { cn } from "@/lib/utils";

type Props = {
  enabled: boolean;
};

export function EventVotingEnabledTag({ enabled }: Props) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        enabled
          ? "border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-200"
          : "border-border bg-muted/50 text-muted-foreground",
      )}
    >
      {enabled ? "Enabled for Event" : "Not Enabled for Event"}
    </span>
  );
}
