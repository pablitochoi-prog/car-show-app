import Image from "next/image";
import { cn } from "@/lib/utils";

/** Square club / placeholder thumb (height = width). */
const squareSizeClasses = {
  xs: "size-6 text-[8px]",
  /** Hosting-club thumb on event cards (50% larger than `xs`). */
  club: "size-9 text-[9px]",
  /** Hosting-club thumb in event organizer form (25% larger than `club`). */
  clubForm: "size-[calc(2.25rem*1.25)] text-[9px]",
  sm: "size-10 text-[10px]",
  md: "size-12 text-xs",
  lg: "size-14 text-sm",
} as const;

/** Event artwork: width = 1.5 × height (3:2), full logo visible via contain. */
const wideSizeClasses = {
  xs: "h-6 w-[calc(1.5rem*1.5)] text-[8px]",
  sm: "h-10 w-[calc(2.5rem*1.5)] text-[10px]",
  md: "h-12 w-[calc(3rem*1.5)] text-xs",
  lg: "h-14 w-[calc(3.5rem*1.5)] text-sm",
} as const;

export function EventLogo({
  src,
  alt,
  size = "md",
  shape = "square",
  className,
  title,
}: {
  src: string | null;
  alt: string;
  size?: keyof typeof squareSizeClasses;
  /** `wide` uses a 1.5:1 landscape frame with object-contain. */
  shape?: "square" | "wide";
  className?: string;
  title?: string;
}) {
  const label = alt.trim() || "Event";
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const isWide = shape === "wide";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg border bg-muted",
        isWide ? wideSizeClasses[size] : squareSizeClasses[size],
        className,
      )}
      title={title}
      aria-hidden={!src && !title}
    >
      {src ? (
        <Image
          src={src}
          alt={label}
          fill
          className={cn(isWide ? "object-contain p-0.5" : "object-contain p-1")}
          sizes={
            isWide
              ? size === "lg"
                ? "84px"
                : size === "md"
                  ? "72px"
                  : size === "sm"
                    ? "60px"
                    : "36px"
              : size === "lg"
                ? "56px"
                : size === "md"
                  ? "48px"
                  : size === "sm"
                    ? "40px"
                    : size === "club"
                      ? "36px"
                      : size === "clubForm"
                        ? "45px"
                        : "24px"
          }
          unoptimized
        />
      ) : (
        <div className="flex size-full items-center justify-center font-semibold uppercase text-muted-foreground">
          {initials || "?"}
        </div>
      )}
    </div>
  );
}
