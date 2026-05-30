import { cn } from "@/lib/utils";

export function RegistrationFeeRow({
  label,
  children,
  className,
  bold = false,
  labelMuted = false,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bold?: boolean;
  labelMuted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-2",
        bold && "border-t pt-1 font-bold",
        className,
      )}
    >
      <span className={cn("shrink-0", labelMuted && "text-muted-foreground")}>
        {label}
      </span>
      <span
        className={cn(
          "break-words sm:text-right sm:shrink-0",
          !bold && "font-medium",
        )}
      >
        {children}
      </span>
    </div>
  );
}

/** Tailwind classes for registration vehicle tables that stack as cards on small screens. */
export const registrationVehiclesTableClassName = cn(
  "w-full text-sm",
  "max-md:[&_thead]:hidden",
  "max-md:[&_tbody_tr]:block max-md:[&_tbody_tr]:border-b max-md:[&_tbody_tr:last-child]:border-b-0",
  "max-md:[&_td]:block max-md:[&_td]:px-3 max-md:[&_td]:py-1.5",
  "max-md:[&_td]:first:pt-3 max-md:[&_td]:last:pb-3",
  "max-md:[&_td[data-label]]:pt-2",
  "max-md:[&_td[data-label]:before]:mb-1 max-md:[&_td[data-label]:before]:block",
  "max-md:[&_td[data-label]:before]:text-xs max-md:[&_td[data-label]:before]:font-medium",
  "max-md:[&_td[data-label]:before]:text-muted-foreground",
  "max-md:[&_td[data-label]:before]:content-[attr(data-label)]",
);
