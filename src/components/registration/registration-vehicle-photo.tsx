"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadPrivateVehiclePhoto } from "@/lib/upload-private-vehicle-photo-client";

/** 3:2 landscape thumbnail (~1.5× wider than tall). */
const PHOTO_THUMB_CLASS = "h-14 w-[5.25rem] shrink-0";

type Props = {
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
  /** Required for private garage uploads. */
  vehicleId: string;
  className?: string;
};

export function RegistrationVehiclePhoto({
  photoUrl,
  onPhotoChange,
  vehicleId,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const result = await uploadPrivateVehiclePhoto(vehicleId, file, {
        isPrimary: true,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onPhotoChange(result.viewUrl);
    } finally {
      setUploading(false);
    }
  }

  const src =
    photoUrl?.startsWith("/api/") || photoUrl?.startsWith("http")
      ? photoUrl
      : null;

  return (
    <div className={cn("relative shrink-0", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => void onFileSelected(e)}
      />
      {src ? (
        <button
          type="button"
          className={cn(
            "block overflow-hidden rounded-md border bg-muted",
            PHOTO_THUMB_CLASS,
          )}
          onClick={() => inputRef.current?.click()}
          title="Change photo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="size-full object-cover" />
        </button>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-muted-foreground/40 bg-muted/50 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted hover:text-foreground",
            PHOTO_THUMB_CLASS,
          )}
          title="Upload photo"
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Upload className="size-4" />
              <span className="text-[9px] font-medium leading-tight">
                Upload photo
              </span>
            </>
          )}
        </button>
      )}
      {error ? (
        <p className="absolute left-0 top-full z-10 mt-1 max-w-48 text-[10px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
