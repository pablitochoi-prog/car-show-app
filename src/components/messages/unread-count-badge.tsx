"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Counter pill for unread messages (on filled primary surfaces or outline nav). */
export function UnreadCountBadge({
  count,
  onPrimary = false,
  className,
}: {
  count: number;
  /** When true, sits on a primary-filled button/tile. */
  onPrimary?: boolean;
  className?: string;
}) {
  if (count <= 0) return null;

  const label = count > 99 ? "99+" : String(count);

  return (
    <Badge
      className={cn(
        "min-w-5 justify-center border-0 px-1.5 py-0 text-[10px] font-semibold tabular-nums leading-none",
        onPrimary
          ? "bg-background text-primary"
          : "bg-primary text-primary-foreground",
        className,
      )}
    >
      {label}
    </Badge>
  );
}
