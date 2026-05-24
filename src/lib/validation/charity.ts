import { z } from "zod";
import {
  optionalEmailField,
  optionalWebsiteField,
} from "@/lib/validation/optional-contact-fields";

export const eventCharitySchema = z.object({
  charityName: z.string().optional(),
  charityDescription: z.string().optional(),
  charityWebsite: optionalWebsiteField(),
  charityEmail: optionalEmailField(),
  charityPhone: z.string().optional(),
  charityLogoUrl: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional(),
});

export type EventCharityInput = z.infer<typeof eventCharitySchema>;
