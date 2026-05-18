import Image from "next/image";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "size-10 text-[10px]",
  md: "size-12 text-xs",
  lg: "size-14 text-sm",
} as const;

export function EventLogo({
  src,
  alt,
  size = "md",
  className,
}: {
  src: string | null;
  alt: string;
  size?: keyof typeof sizeClasses;
  className?: string;
}) {
  const label = alt.trim() || "Event";
  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg border bg-muted",
        sizeClasses[size],
        className,
      )}
      aria-hidden={!src}
    >
      {src ? (
        <Image
          src={src}
          alt={label}
          fill
          className="object-cover"
          sizes={size === "lg" ? "56px" : size === "md" ? "48px" : "40px"}
        />
      ) : (
        <div className="flex size-full items-center justify-center font-semibold uppercase text-muted-foreground">
          {initials || "?"}
        </div>
      )}
    </div>
  );
}
