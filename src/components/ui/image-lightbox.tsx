"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Trash2, Upload, ZoomIn, ZoomOut, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ImageLightboxProps = {
  src: string;
  alt?: string;
  canEdit?: boolean;
  onClose: () => void;
  onRemove?: () => void;
  onReplace?: (file: File) => void;
};

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const DEFAULT_ZOOM_INDEX = 2; // 1x = 800×600

export function ImageLightbox({
  src,
  alt = "Image preview",
  canEdit = false,
  onClose,
  onRemove,
  onReplace,
}: ImageLightboxProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [zoomIdx, setZoomIdx] = useState(DEFAULT_ZOOM_INDEX);
  const scale = ZOOM_STEPS[zoomIdx];

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const canZoomIn = zoomIdx < ZOOM_STEPS.length - 1;
  const canZoomOut = zoomIdx > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <div
        className="relative flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="overflow-auto rounded-lg shadow-xl"
          style={{
            width: `${Math.round(800 * scale)}px`,
            maxWidth: "90vw",
            height: `${Math.round(600 * scale)}px`,
            maxHeight: "80vh",
            resize: "both",
          }}
        >
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-contain"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canZoomOut}
            onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
            aria-label="Zoom out"
          >
            <ZoomOut className="size-4" />
          </Button>
          <span className="min-w-[3.5rem] text-center text-xs text-white/80">
            {Math.round(scale * 100)}%
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canZoomIn}
            onClick={() =>
              setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))
            }
            aria-label="Zoom in"
          >
            <ZoomIn className="size-4" />
          </Button>

          <span className="mx-1 h-5 w-px bg-white/20" />

          {canEdit && onRemove && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="gap-1.5"
              onClick={() => {
                onRemove();
                onClose();
              }}
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          )}

          {canEdit && onReplace && (
            <>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-1.5"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="size-4" />
                Replace
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onReplace(file);
                    onClose();
                  }
                }}
              />
            </>
          )}

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={onClose}
          >
            <X className="size-4" />
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Wraps any thumbnail image with a semi-transparent eye watermark
 * to hint that clicking opens a larger preview.
 */
export function ThumbnailWithEye({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative shrink-0 ${className}`}
    >
      {children}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-black/0 transition-colors group-hover:bg-black/30">
        <Eye className="size-5 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-90" />
      </span>
    </button>
  );
}
