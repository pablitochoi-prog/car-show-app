import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AwardsCountBadge({
  count,
  className,
  showZero = false,
}: {
  count: number;
  className?: string;
  /** When true, renders a "0" badge instead of hiding. */
  showZero?: boolean;
}) {
  if (count <= 0 && !showZero) return null;

  const label = count > 999 ? "999+" : String(count);

  return (
    <Badge
      variant="default"
      className={cn(
        "min-w-6 justify-center px-2 tabular-nums",
        className,
      )}
    >
      {label}
    </Badge>
  );
}
