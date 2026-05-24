import Image from "next/image";
import { cn } from "@/lib/utils";

type SiteSponsorLogoProps = {
  logoUrl: string;
  websiteUrl?: string | null;
  name?: string | null;
  className?: string;
  imageClassName?: string;
  width?: number;
  height?: number;
};

/** Site sponsor logo; links to the sponsor website when configured. */
export function SiteSponsorLogo({
  logoUrl,
  websiteUrl,
  name,
  className,
  imageClassName,
  width = 160,
  height = 64,
}: SiteSponsorLogoProps) {
  const logo = logoUrl.trim();
  if (!logo) return null;

  const displayName = name?.trim() || "";
  const alt = displayName ? `${displayName} logo` : "Site sponsor logo";
  const href = websiteUrl?.trim() || "";

  const image = (
    <Image
      src={logo}
      alt={alt}
      width={width}
      height={height}
      unoptimized
      className={cn("h-auto w-auto max-h-16 max-w-[160px] object-contain", imageClassName)}
    />
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("inline-block transition-opacity hover:opacity-90", className)}
        aria-label={displayName ? `Visit ${displayName}` : "Visit site sponsor website"}
      >
        {image}
      </a>
    );
  }

  return <div className={cn("inline-block", className)}>{image}</div>;
}
