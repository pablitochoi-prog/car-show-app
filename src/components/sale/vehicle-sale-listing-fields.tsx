"use client";

import { useRef, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { listingDescriptionToEditorHtml } from "@/lib/listing-description-html";
import { isPolicyHtmlEmpty } from "@/lib/sanitize-policy-html";
import { cn } from "@/lib/utils";
import { formatWholeDollarInput, centsToWholeDollarInput } from "@/lib/money";
import { VEHICLE_SALE_SELLER_DISCLAIMER } from "@/lib/vehicle-sale-disclaimer";
import type { VehicleSaleListingInput } from "@/lib/validation/vehicle-sale-listing";
import type { VehicleSaleListingSnapshot } from "@/lib/vehicle-sale-listings-for-registration";

export type VehicleSaleListingFormState = {
  listingId: string;
  enabled: boolean;
  askingPriceDollars: string;
  showAskingPricePublicly: boolean;
  allowOffers: boolean;
  minimumOfferDollars: string;
  description: string;
  sellerAcknowledged: boolean;
  photos: Array<{
    publicUrl: string;
    objectKey: string;
    sortOrder: number;
    originalFilename?: string;
    contentType?: string;
  }>;
};

export function emptyVehicleSaleListingFormState(): VehicleSaleListingFormState {
  return {
    listingId: crypto.randomUUID(),
    enabled: false,
    askingPriceDollars: "",
    showAskingPricePublicly: false,
    allowOffers: false,
    minimumOfferDollars: "",
    description: "",
    sellerAcknowledged: false,
    photos: [],
  };
}

export function vehicleSaleListingFormStateFromApi(
  data: VehicleSaleListingSnapshot,
): VehicleSaleListingFormState {
  return {
    listingId: data.listingId,
    enabled: data.enabled,
    askingPriceDollars:
      data.askingPriceCents != null
        ? centsToWholeDollarInput(data.askingPriceCents)
        : "",
    showAskingPricePublicly: data.showAskingPricePublicly,
    allowOffers: data.allowOffers,
    minimumOfferDollars:
      data.minimumOfferCents != null
        ? centsToWholeDollarInput(data.minimumOfferCents)
        : "",
    description: data.description ?? "",
    sellerAcknowledged: data.sellerAcknowledged,
    photos: data.photos.map((photo) => ({
      publicUrl: photo.publicUrl,
      objectKey: photo.objectKey,
      sortOrder: photo.sortOrder,
      originalFilename: photo.originalFilename ?? undefined,
      contentType: photo.contentType ?? undefined,
    })),
  };
}

export function vehicleSaleListingFormStateToPayload(
  state: VehicleSaleListingFormState,
): VehicleSaleListingInput {
  return {
    enabled: state.enabled,
    listingId: state.listingId,
    askingPriceDollars: state.askingPriceDollars.trim() || undefined,
    showAskingPricePublicly: state.showAskingPricePublicly,
    allowOffers: state.allowOffers,
    minimumOfferDollars: state.allowOffers
      ? state.minimumOfferDollars.trim() || undefined
      : undefined,
    description: isPolicyHtmlEmpty(state.description)
      ? undefined
      : state.description.trim() || undefined,
    sellerAcknowledged: state.sellerAcknowledged,
    photos: state.photos.map((photo, index) => ({
      publicUrl: photo.publicUrl,
      objectKey: photo.objectKey,
      sortOrder: index,
      originalFilename: photo.originalFilename,
      contentType: photo.contentType,
    })),
  };
}

type Props = {
  eventId: string;
  vehicleLabel: string;
  value: VehicleSaleListingFormState;
  onChange: (next: VehicleSaleListingFormState) => void;
  className?: string;
  /** When false, fields always show (used inside the sale inquiry dialog). */
  showEnableCheckbox?: boolean;
};

export function VehicleSaleListingFields({
  eventId,
  vehicleLabel,
  value,
  onChange,
  className,
  showEnableCheckbox = true,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  function patch(partial: Partial<VehicleSaleListingFormState>) {
    onChange({ ...value, ...partial });
  }

  async function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("listingId", value.listingId);
      const res = await fetch(
        `/api/events/${eventId}/vehicle-sale-listing-photo/upload`,
        { method: "POST", body: fd },
      );
      const data = (await res.json().catch(() => null)) as {
        url?: string;
        objectKey?: string;
        originalName?: string;
        contentType?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.url || !data.objectKey) {
        setUploadError(data?.error ?? "Could not upload photo.");
        return;
      }
      if (value.photos.length >= 8) {
        setUploadError("Maximum 8 photos per listing.");
        return;
      }
      patch({
        photos: [
          ...value.photos,
          {
            publicUrl: data.url,
            objectKey: data.objectKey,
            sortOrder: value.photos.length,
            originalFilename: data.originalName,
            contentType: data.contentType,
          },
        ],
      });
    } catch {
      setUploadError("Could not upload photo.");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(index: number) {
    patch({
      photos: value.photos.filter((_, i) => i !== index),
    });
  }

  const showFields = showEnableCheckbox ? value.enabled : true;

  const fieldsBody = showFields ? (
    <div className={cn("space-y-3", showEnableCheckbox && "border-t pt-3")}>
      <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`sale-price-${value.listingId}`} className="text-xs">
                    Asking price (optional)
                  </Label>
                  <Input
                    id={`sale-price-${value.listingId}`}
                    inputMode="numeric"
                    placeholder="e.g. $25,000"
                    value={value.askingPriceDollars}
                    onChange={(e) =>
                      patch({
                        askingPriceDollars: formatWholeDollarInput(e.target.value),
                      })
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 rounded border-input"
                      checked={value.showAskingPricePublicly}
                      onChange={(e) =>
                        patch({ showAskingPricePublicly: e.target.checked })
                      }
                    />
                    Show asking price on public listing
                  </label>
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 rounded border-input"
                  checked={value.allowOffers}
                  onChange={(e) =>
                    patch({
                      allowOffers: e.target.checked,
                      minimumOfferDollars: e.target.checked
                        ? value.minimumOfferDollars
                        : "",
                    })
                  }
                />
                Allow buyers to submit an offer amount
              </label>

              {value.allowOffers ? (
                <div className="space-y-1">
                  <Label
                    htmlFor={`sale-min-offer-${value.listingId}`}
                    className="text-xs"
                  >
                    Private minimum offer screening amount
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Used only to filter low offers. This amount is never shown to
                    buyers.
                  </p>
                  <Input
                    id={`sale-min-offer-${value.listingId}`}
                    inputMode="numeric"
                    placeholder="e.g. $20,000"
                    value={value.minimumOfferDollars}
                    onChange={(e) =>
                      patch({
                        minimumOfferDollars: formatWholeDollarInput(
                          e.target.value,
                        ),
                      })
                    }
                    className="h-8 max-w-xs text-sm"
                  />
                </div>
              ) : null}

              <div className="space-y-1">
                <Label
                  htmlFor={`sale-desc-${value.listingId}`}
                  className="text-xs"
                >
                  Vehicle story (optional)
                </Label>
                <RichTextEditor
                  idPrefix={`sale-desc-${value.listingId}`}
                  value={listingDescriptionToEditorHtml(value.description)}
                  onChange={(html) =>
                    patch({ description: isPolicyHtmlEmpty(html) ? "" : html })
                  }
                  compact
                  placeholder="Share your vehicle's story — history, modifications, or what makes it special."
                  aria-label="Vehicle story"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Listing photos (optional)</Label>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={(e) => void onPhotoSelected(e)}
                />
                <div className="flex flex-wrap gap-2">
                  {value.photos.map((photo, index) => (
                    <div key={photo.objectKey} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.publicUrl}
                        alt=""
                        className="size-16 rounded-md border object-cover"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="absolute -right-1 -top-1 size-6"
                        onClick={() => removePhoto(index)}
                        aria-label="Remove photo"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}
                  {value.photos.length < 8 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-16 w-16 flex-col gap-1"
                      disabled={uploading}
                      onClick={() => inputRef.current?.click()}
                    >
                      {uploading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          <Plus className="size-4" />
                          <span className="text-[10px]">Add</span>
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>
                {uploadError ? (
                  <p className="text-xs text-destructive">{uploadError}</p>
                ) : null}
              </div>

              <label className="flex items-start gap-2 rounded-md border bg-background p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 rounded border-input"
                  checked={value.sellerAcknowledged}
                  onChange={(e) =>
                    patch({ sellerAcknowledged: e.target.checked })
                  }
                />
                <span>
                  I understand CarShowScout only forwards inquiries and is not
                  involved in negotiating or completing any sale.
                </span>
              </label>
    </div>
  ) : null;

  if (!showEnableCheckbox) {
    return (
      <div className={cn("space-y-3", className)}>
        <p className="text-xs text-muted-foreground">
          {VEHICLE_SALE_SELLER_DISCLAIMER}
        </p>
        {fieldsBody}
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-muted/20 p-3", className)}>
      <div className="flex items-start gap-3">
        <input
          id={`sale-enabled-${value.listingId}`}
          type="checkbox"
          className="mt-1 size-4 rounded border-input"
          checked={value.enabled}
          onChange={(e) =>
            patch({
              enabled: e.target.checked,
            })
          }
        />
        <div className="min-w-0 flex-1 space-y-3">
          <Label
            htmlFor={`sale-enabled-${value.listingId}`}
            className="cursor-pointer font-medium"
          >
            Open to Buyer Inquiries about Vehicle
          </Label>
          <p className="text-xs text-muted-foreground">
            {VEHICLE_SALE_SELLER_DISCLAIMER}
          </p>
          {fieldsBody}
        </div>
      </div>
    </div>
  );
}
