"use client";

import { useRef } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  VehiclePhotoDisplay,
  vehiclePhotoImgClassName,
} from "@/components/vehicle/vehicle-photo-display";

const PREVIEW_CLASS =
  "vehicle-photo-frame flex w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted";

type Props = {
  idPrefix: string;
  previewUrl: string | null;
  disabled?: boolean;
  onFileSelected: (file: File) => void;
  onClear: () => void;
  helperText?: string;
};

export function VehiclePhotoDraftField({
  idPrefix,
  previewUrl,
  disabled = false,
  onFileSelected,
  onClear,
  helperText = "JPG, PNG, or WebP · max 8MB",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    onFileSelected(file);
  }

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className={PREVIEW_CLASS}>
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className={vehiclePhotoImgClassName} />
        ) : (
          <div className="flex size-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
            Photo preview
          </div>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-photo`}>Vehicle photo</Label>
        <input
          ref={inputRef}
          id={`${idPrefix}-photo`}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={disabled}
          onChange={handleChange}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-2 size-4" />
            Choose photo
          </Button>
          {previewUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={disabled}
              onClick={onClear}
            >
              <X className="mr-1 size-4" />
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">{helperText}</p>
      </div>
    </div>
  );
}

/** Small thumbnail for review lists. */
export function VehicleRegistrationPhotoThumb({
  photoUrl,
  className,
}: {
  photoUrl: string | null;
  className?: string;
}) {
  return (
    <VehiclePhotoDisplay
      src={photoUrl}
      alt=""
      size="inline"
      className={className}
    />
  );
}
