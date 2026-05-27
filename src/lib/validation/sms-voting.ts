import { z } from "zod";
import {
  MAX_CUSTOM_VOTING_CATEGORIES_PER_EVENT,
  MAX_VOTING_CATEGORIES_PER_EVENT,
} from "@/lib/sms/voting-category-presets";

export const eventSmsVotingCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  smsOptionNumber: z.number().int().min(1).max(3),
  isActive: z.boolean(),
  isCustom: z.boolean().optional().default(false),
  maxVotesPerPhone: z.number().int().min(1).max(5).optional().default(1),
});

export function createEventSmsVotingSettingsSchema(
  eligiblePresetNames: string[],
) {
  const eligibleSet = new Set(eligiblePresetNames);

  return z
    .object({
      smsVotingEnabled: z.boolean(),
      smsVotingStartsAt: z.string().datetime().nullable().optional(),
      smsVotingEndsAt: z.string().datetime().nullable().optional(),
      categories: z
        .array(eventSmsVotingCategorySchema)
        .max(MAX_VOTING_CATEGORIES_PER_EVENT),
    })
    .superRefine((data, ctx) => {
      const active = data.categories.filter((c) => c.isActive);

      if (data.smsVotingEnabled && active.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Choose at least one voting category when SMS voting is enabled.",
          path: ["categories"],
        });
      }

      const optionNumbers = active.map((c) => c.smsOptionNumber);
      if (new Set(optionNumbers).size !== optionNumbers.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Each active category needs a unique SMS option number (1–3).",
          path: ["categories"],
        });
      }

      const customCount = data.categories.filter((c) => c.isCustom).length;
      if (customCount > MAX_CUSTOM_VOTING_CATEGORIES_PER_EVENT) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "You can add at most one custom voting category.",
          path: ["categories"],
        });
      }

      for (const cat of data.categories) {
        if (!cat.isCustom && !eligibleSet.has(cat.name)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `"${cat.name}" is not eligible for SMS / QR voting.`,
            path: ["categories"],
          });
        }
      }

      if (data.smsVotingStartsAt && data.smsVotingEndsAt) {
        const start = new Date(data.smsVotingStartsAt);
        const end = new Date(data.smsVotingEndsAt);
        if (end <= start) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Voting close must be after voting open.",
            path: ["smsVotingEndsAt"],
          });
        }
      }
    });
}

export type EventSmsVotingSettingsInput = z.infer<
  ReturnType<typeof createEventSmsVotingSettingsSchema>
>;

export function buildSmsVotingInstruction(params: {
  vehicleEntryCode: string;
  smsNumber: string;
  activeCategoryCount: number;
  singleCategoryName?: string | null;
}): string {
  const { vehicleEntryCode, smsNumber, activeCategoryCount, singleCategoryName } =
    params;
  if (activeCategoryCount <= 1 && singleCategoryName) {
    return `${singleCategoryName}: Text ${vehicleEntryCode} to ${smsNumber}`;
  }
  if (activeCategoryCount <= 1) {
    return `Text ${vehicleEntryCode} to ${smsNumber} to vote.`;
  }
  return `Text ${vehicleEntryCode} to ${smsNumber} to vote. We'll reply with award choices.`;
}
