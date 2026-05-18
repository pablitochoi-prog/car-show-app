import { cn } from "@/lib/utils";
import { formatEventShowNumber } from "@/lib/event-show-number";

type EventNameWithNumberProps = {
  name: string;
  showNumber: number;
  className?: string;
  numberClassName?: string;
  /** When true, show number before the name (useful in compact lists). */
  numberFirst?: boolean;
};

/**
 * Event title with unique car show number (EVT-####) beside the name.
 */
export function EventNameWithNumber({
  name,
  showNumber,
  className,
  numberClassName,
  numberFirst = false,
}: EventNameWithNumberProps) {
  const code = (
    <span
      className={cn(
        "font-normal tabular-nums text-muted-foreground",
        numberClassName,
      )}
    >
      {formatEventShowNumber(showNumber)}
    </span>
  );

  if (numberFirst) {
    return (
      <span className={className}>
        {code}
        <span className="mx-1.5 text-muted-foreground/60" aria-hidden>
          ·
        </span>
        <span>{name}</span>
      </span>
    );
  }

  return (
    <span className={className}>
      <span>{name}</span>
      <span className="mx-1.5 text-muted-foreground/60" aria-hidden>
        ·
      </span>
      {code}
    </span>
  );
}
