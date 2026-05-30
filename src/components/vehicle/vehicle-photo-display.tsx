import { cn } from "@/lib/utils";

/** Shared img class — full car width visible, no hood/trunk crop. */
export const vehiclePhotoImgClassName =
  "vehicle-photo-img block h-auto w-full max-w-full object-contain object-center";

export function resolveVehiclePhotoSrc(
  src: string | null | undefined,
): string | null {
  if (!src?.trim()) return null;
  const s = src.trim();
  if (
    s.startsWith("/api/") ||
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("data:") ||
    s.startsWith("blob:")
  ) {
    return s;
  }
  return null;
}

type VehiclePhotoDisplayProps = {
  src: string | null | undefined;
  alt: string;
  /** full = page width; thumb = registration table; inline = tiny list icon */
  size?: "full" | "thumb" | "inline";
  className?: string;
};

export function VehiclePhotoDisplay({
  src,
  alt,
  size = "full",
  className,
}: VehiclePhotoDisplayProps) {
  const resolved = resolveVehiclePhotoSrc(src);
  if (!resolved) return null;

  return (
    <div
      className={cn(
        "vehicle-photo-frame flex items-center justify-center overflow-hidden rounded-md border border-border bg-muted",
        size === "full" && "w-full",
        size === "thumb" && "vehicle-photo-frame--thumb",
        size === "inline" && "vehicle-photo-frame--inline",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={resolved} alt={alt} className={vehiclePhotoImgClassName} />
    </div>
  );
}
