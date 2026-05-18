"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
  /** When set, PATCHes the vehicle record after a successful upload. */
  vehicleId?: string;
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

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/vehicles/upload", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const raw = await res.text();
      let data = {} as { error?: string; url?: string };
      try {
        data = raw.trim() ? (JSON.parse(raw) as { error?: string; url?: string }) : {};
      } catch {
        return;
      }
      if (!res.ok || !data.url) return;

      if (vehicleId) {
        await fetch(`/api/vehicles/${vehicleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoUrl: data.url }),
          credentials: "same-origin",
        });
      }

      onPhotoChange(data.url);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={cn("relative shrink-0", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => void onFileSelected(e)}
      />
      {photoUrl ? (
        <button
          type="button"
          className="block size-14 overflow-hidden rounded-md border bg-muted"
          onClick={() => inputRef.current?.click()}
          title="Change photo"
        >
          <img
            src={photoUrl}
            alt=""
            className="size-full object-cover"
          />
        </button>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex size-14 flex-col items-center justify-center gap-0.5 rounded-md border border-dashed border-muted-foreground/40 bg-muted/50 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted hover:text-foreground"
          title="Upload photo"
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              <Upload className="size-4" />
              <span className="text-[9px] font-medium leading-tight">Upload photo</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
