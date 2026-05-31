import { z } from "zod";
import { sanitizeInquiryMessageHtml } from "@/lib/listing-description-html";
import { parseListingPriceCents } from "@/lib/validation/vehicle-sale-listing";
import {
  addSmsOptInRequiresPhoneRefinement,
  smsNotificationsOptInFieldSchema,
} from "@/lib/validation/sms-notifications-consent";

export const vehicleSaleInquirySchema = z
  .object({
    buyerFirstName: z
      .string()
      .trim()
      .min(1, "First name is required.")
      .max(60),
    buyerLastName: z
      .string()
      .trim()
      .min(1, "Last name is required.")
      .max(60),
    buyerEmail: z.string().trim().email("Enter a valid email.").max(254),
    buyerPhone: z.string().trim().max(30).optional().or(z.literal("")),
    offerAmountDollars: z.union([z.string(), z.number(), z.null()]).optional(),
    message: z.string().max(5000).optional().or(z.literal("")),
    smsNotificationsOptIn: smsNotificationsOptInFieldSchema,
    consent: z.literal(true, {
      message: "You must agree before submitting.",
    }),
    /** Honeypot — must stay empty. */
    website: z.string().max(0).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    addSmsOptInRequiresPhoneRefinement(
      data,
      (d) => d.buyerPhone,
      "buyerPhone",
      ctx,
    );

    const raw = data.offerAmountDollars;
    if (
      (typeof raw === "number" && raw < 0) ||
      (typeof raw === "string" && /^\s*-/.test(raw))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Offer cannot be negative.",
        path: ["offerAmountDollars"],
      });
      return;
    }

    const offerCents = parseListingPriceCents(data.offerAmountDollars);
    if (offerCents != null && offerCents < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Offer cannot be negative.",
        path: ["offerAmountDollars"],
      });
    }
  });

export type VehicleSaleInquiryInput = z.infer<typeof vehicleSaleInquirySchema>;

export function formatVehicleSaleInquiryBuyerName(input: {
  buyerFirstName: string;
  buyerLastName: string;
}): string {
  return `${input.buyerFirstName.trim()} ${input.buyerLastName.trim()}`;
}

export function normalizeInquiryMessage(
  message: string | undefined,
): string | null {
  if (!message?.trim()) return null;
  return sanitizeInquiryMessageHtml(message);
}
