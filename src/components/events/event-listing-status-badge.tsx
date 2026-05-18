import type { EventStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatStatusLabel } from "@/components/dashboard/events/format-event-meta";

/** Matches organizer listing status colors in the event form. */
export function eventListingStatusBadgeClass(status: EventStatus): string {
  switch (status) {
    case "DRAFT":
      return "border-pink-300/80 bg-pink-50 text-pink-900 dark:border-pink-500/60 dark:bg-pink-950/40 dark:text-pink-100";
    case "SCHEDULED":
      return "border-yellow-400/80 bg-yellow-50 text-yellow-950 dark:border-yellow-600/60 dark:bg-yellow-950/40 dark:text-yellow-100";
    case "PUBLISHED":
      return "border-green-500/80 bg-green-50 text-green-900 dark:border-green-600/60 dark:bg-green-950/40 dark:text-green-100";
    default:
      return "border-border bg-muted/50 text-muted-foreground";
  }
}

export function EventListingStatusBadge({
  status,
  className,
}: {
  status: EventStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border font-medium capitalize",
        eventListingStatusBadgeClass(status),
        className,
      )}
    >
      {formatStatusLabel(status)}
    </Badge>
  );
}
