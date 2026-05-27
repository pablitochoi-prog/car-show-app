import Image from "next/image";
import { cn } from "@/lib/utils";

/** Full wordmark on white — readable on the app's light UI. */
export const SITE_LOGO_SRC = "/brand/carshowscout-logo.jpg";

const LOGO_WIDTH = 1024;
const LOGO_HEIGHT = 819;

type SiteLogoProps = {
  /** Header height vs larger homepage hero */
  size?: "header" | "hero";
  className?: string;
  priority?: boolean;
};

/**
 * CarShowScout wordmark. Uses the JPG export because `carshowscout-mark.png`
 * has a white car on a transparent background and disappears on light pages.
 */
export function SiteLogo({
  size = "header",
  className,
  priority = false,
}: SiteLogoProps) {
  return (
    <Image
      src={SITE_LOGO_SRC}
      alt="CarShowScout.com"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      unoptimized
      priority={priority}
      className={cn(
        "h-auto shrink-0 object-contain",
        size === "header" && "h-14 w-auto sm:h-16",
        size === "hero" && "mx-auto w-[min(320px,85vw)]",
        className,
      )}
    />
  );
}
