import { z } from "zod";
import { sanitizeListingDescriptionHtml } from "@/lib/listing-description-html";
import { dollarsToCents, parseCurrencyDollarsInput } from "@/lib/money";

export const vehicleSalePhotoInputSchema = z.object({
  publicUrl: z.string().url("Invalid photo URL").max(2000),
  objectKey: z.string().min(1).max(500).optional(),
  sortOrder: z.coerce.number().int().min(0).max(20).optional(),
  originalFilename: z.string().max(255).optional(),
  contentType: z.string().max(100).optional(),
});

export const vehicleSaleListingInputSchema = z
  .object({
    enabled: z.boolean(),
    listingId: z.string().uuid().optional(),
    askingPriceDollars: z.union([z.string(), z.number(), z.null()]).optional(),
    showAskingPricePublicly: z.boolean().optional(),
    allowOffers: z.boolean().optional(),
    minimumOfferDollars: z.union([z.string(), z.number(), z.null()]).optional(),
    description: z.string().max(5000).optional(),
    sellerAcknowledged: z.boolean().optional(),
    photos: z.array(vehicleSalePhotoInputSchema).max(8).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.enabled) return;

    if (!data.sellerAcknowledged) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "You must acknowledge the sale disclaimer before accepting inquiries.",
        path: ["sellerAcknowledged"],
      });
    }

    const askingCents = parseListingPriceCents(data.askingPriceDollars);
    if (askingCents != null && askingCents < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Asking price cannot be negative.",
        path: ["askingPriceDollars"],
      });
    }

    const minOfferCents = parseListingPriceCents(data.minimumOfferDollars);
    if (minOfferCents != null && minOfferCents < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum offer cannot be negative.",
        path: ["minimumOfferDollars"],
      });
    }

    if (
      data.allowOffers &&
      minOfferCents != null &&
      askingCents != null &&
      minOfferCents > askingCents
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum offer cannot exceed the asking price.",
        path: ["minimumOfferDollars"],
      });
    }
  });

export type VehicleSaleListingInput = z.infer<
  typeof vehicleSaleListingInputSchema
>;

export type VehicleSalePhotoInput = z.infer<typeof vehicleSalePhotoInputSchema>;

export function parseListingPriceCents(
  value: string | number | null | undefined,
): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) return null;
    return dollarsToCents(value);
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dollars = parseCurrencyDollarsInput(trimmed);
  if (dollars == null) return null;
  return dollarsToCents(Math.round(dollars));
}

export function normalizeVehicleSaleListingInput(
  input: VehicleSaleListingInput,
): {
  listingId: string | undefined;
  enabled: boolean;
  askingPriceCents: number | null;
  showAskingPricePublicly: boolean;
  allowOffers: boolean;
  minimumOfferCents: number | null;
  description: string | null;
  sellerAcknowledgedAt: Date | null;
  photos: VehicleSalePhotoInput[];
} {
  return {
    listingId: input.listingId,
    enabled: input.enabled,
    askingPriceCents: parseListingPriceCents(input.askingPriceDollars),
    showAskingPricePublicly: input.showAskingPricePublicly ?? false,
    allowOffers: input.allowOffers ?? false,
    minimumOfferCents: input.allowOffers
      ? parseListingPriceCents(input.minimumOfferDollars)
      : null,
    description: input.description
      ? sanitizeListingDescriptionHtml(input.description)
      : null,
    sellerAcknowledgedAt:
      input.sellerAcknowledged || input.enabled
        ? new Date()
        : null,
    photos: input.photos ?? [],
  };
}
