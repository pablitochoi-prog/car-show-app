import { z } from "zod";
import {
  optionalEmailField,
  optionalWebsiteField,
} from "@/lib/validation/optional-contact-fields";

export const eventSponsorSchema = z.object({
  sponsorName: z.string().optional(),
  sponsorPrimaryContact: z.string().optional(),
  sponsorStreet: z.string().optional(),
  sponsorCity: z.string().optional(),
  sponsorState: z.string().optional(),
  sponsorZip: z.string().optional(),
  sponsorPhone: z.string().optional(),
  sponsorEmail: optionalEmailField(),
  sponsorWebsite: optionalWebsiteField(),
  sponsorLogoUrl: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional(),
});

export type EventSponsorInput = z.infer<typeof eventSponsorSchema>;
