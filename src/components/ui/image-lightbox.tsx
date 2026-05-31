"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type GalleryPhoto = {
  src: string;
  alt?: string;
};

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const DEFAULT_ZOOM_INDEX = 2; // 1x = 800×600

export type ImageGalleryLightboxProps = {
  photos: GalleryPhoto[];
  initialIndex?: number;
  onClose: () => void;
};

export function ImageGalleryLightbox({
  photos,
  initialIndex = 0,
  onClose,
}: ImageGalleryLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [zoomIdx, setZoomIdx] = useState(DEFAULT_ZOOM_INDEX);
  const scale = ZOOM_STEPS[zoomIdx];
  const current = photos[index];
  const hasMultiple = photos.length > 1;

  useEffect(() => {
    setIndex(initialIndex);
    setZoomIdx(DEFAULT_ZOOM_INDEX);
  }, [initialIndex]);

  useEffect(() => {
    setZoomIdx(DEFAULT_ZOOM_INDEX);
  }, [index]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i <= 0 ? photos.length - 1 : i - 1));
  }, [photos.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i >= photos.length - 1 ? 0 : i + 1));
  }, [photos.length]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (hasMultiple && e.key === "ArrowLeft") goPrev();
      if (hasMultiple && e.key === "ArrowRight") goNext();
    },
    [onClose, hasMultiple, goPrev, goNext],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  if (!current) return null;

  const canZoomIn = zoomIdx < ZOOM_STEPS.length - 1;
  const canZoomOut = zoomIdx > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={current.alt ?? "Photo gallery"}
    >
      {hasMultiple ? (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="absolute left-3 top-1/2 z-10 -translate-y-1/2 bg-background/90 sm:left-6"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          aria-label="Previous photo"
        >
          <ChevronLeft className="size-5" />
        </Button>
      ) : null}

      {hasMultiple ? (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="absolute right-3 top-1/2 z-10 -translate-y-1/2 bg-background/90 sm:right-6"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="Next photo"
        >
          <ChevronRight className="size-5" />
        </Button>
      ) : null}

      <div
        className="relative flex max-h-full max-w-full flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {hasMultiple ? (
          <p className="text-sm font-medium text-white/90">
            {index + 1} / {photos.length}
          </p>
        ) : null}

        <div
          className="overflow-auto rounded-lg shadow-xl"
          style={{
            width: `${Math.round(800 * scale)}px`,
            maxWidth: "90vw",
            height: `${Math.round(600 * scale)}px`,
            maxHeight: "80vh",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.src}
            alt={current.alt ?? "Vehicle photo"}
            className="h-full w-full object-contain"
            draggable={false}
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
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

          <span className="mx-1 hidden h-5 w-px bg-white/20 sm:block" />

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

        {scale > 1 ? (
          <p className="text-center text-xs text-white/70">
            Scroll or drag inside the photo to pan when zoomed in.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export type ImageLightboxProps = {
  src: string;
  alt?: string;
  canEdit?: boolean;
  onClose: () => void;
  onRemove?: () => void;
  onReplace?: (file: File) => void;
};

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
      className={cn("group relative inline-block w-fit max-w-full shrink-0", className)}
    >
      {children}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-black/0 transition-colors group-hover:bg-black/30 group-focus-visible:bg-black/30">
        <Eye className="size-5 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-90 group-focus-visible:opacity-90" />
      </span>
    </button>
  );
}
