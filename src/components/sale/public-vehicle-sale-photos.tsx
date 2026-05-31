"use client";

import { useMemo, useState } from "react";
import {
  ImageGalleryLightbox,
  ThumbnailWithEye,
} from "@/components/ui/image-lightbox";
import { resolveVehiclePhotoSrc, vehiclePhotoImgClassName } from "@/components/vehicle/vehicle-photo-display";
import { cn } from "@/lib/utils";

type Props = {
  mainPhotoUrl: string | null;
  mainPhotoAlt: string;
  listingPhotos: Array<{ publicUrl: string }>;
};

export function PublicVehicleSalePhotos({
  mainPhotoUrl,
  mainPhotoAlt,
  listingPhotos,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const galleryPhotos = useMemo(() => {
    const items: Array<{ src: string; alt: string }> = [];
    if (mainPhotoUrl) {
      items.push({ src: mainPhotoUrl, alt: mainPhotoAlt });
    }
    listingPhotos.forEach((photo, index) => {
      if (items.some((item) => item.src === photo.publicUrl)) return;
      items.push({
        src: photo.publicUrl,
        alt: `Vehicle listing photo ${index + 1}`,
      });
    });
    return items;
  }, [mainPhotoUrl, mainPhotoAlt, listingPhotos]);

  if (galleryPhotos.length === 0) return null;

  const safeIndex = Math.min(activeIndex, galleryPhotos.length - 1);
  const activePhoto = galleryPhotos[safeIndex]!;
  const activeSrc = resolveVehiclePhotoSrc(activePhoto.src);

  return (
    <section className="space-y-2">
      <ThumbnailWithEye
        onClick={() => setLightboxIndex(safeIndex)}
        className="block w-full cursor-zoom-in"
      >
        <div className="flex max-h-[min(50vh,20rem)] min-h-[10rem] w-full items-center justify-center overflow-hidden rounded-md border border-border bg-muted sm:max-h-[22rem]">
          {activeSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeSrc}
              alt={activePhoto.alt}
              className={cn(vehiclePhotoImgClassName, "max-h-[min(50vh,20rem)] sm:max-h-[22rem]")}
            />
          ) : null}
        </div>
      </ThumbnailWithEye>

      {galleryPhotos.length > 1 ? (
        <div
          className="flex gap-2 overflow-x-auto pb-1 pt-1"
          role="tablist"
          aria-label="Vehicle photos"
        >
          {galleryPhotos.map((photo, index) => {
            const thumbSrc = resolveVehiclePhotoSrc(photo.src);
            if (!thumbSrc) return null;
            const selected = index === safeIndex;

            return (
              <button
                key={photo.src}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={photo.alt}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "relative h-16 w-24 shrink-0 overflow-hidden rounded-md border bg-muted transition-shadow",
                  selected
                    ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "border-border hover:border-primary/50",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbSrc}
                  alt=""
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {lightboxIndex != null ? (
        <ImageGalleryLightbox
          photos={galleryPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </section>
  );
}
