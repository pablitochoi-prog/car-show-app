import { cn } from "@/lib/utils";

/** Green status pill for completed event setup sections. */
export function CompletedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
        className,
      )}
    >
      Completed
    </span>
  );
}
