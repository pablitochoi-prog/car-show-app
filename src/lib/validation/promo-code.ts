import { z } from "zod";
import type { PlatformFeePromoCodeStatus } from "@prisma/client";

const promoStatusEnum = z.enum([
  "DRAFT",
  "ACTIVE",
  "RESERVED",
  "REDEEMED",
  "EXPIRED",
  "REVOKED",
  "ARCHIVED",
]);

export const PROMO_CODE_CREATE_COUNTS = [1, 10] as const;

export const promoCodeCreateSchema = z.object({
  count: z
    .union([z.literal(1), z.literal(10)])
    .optional()
    .default(1),
  status: promoStatusEnum.optional().default("DRAFT"),
  expiresAt: z.string().datetime().nullable().optional(),
  internalNotes: z.string().max(5000).nullable().optional(),
  reservedOrganizationName: z.string().max(200).nullable().optional(),
  reservedEventName: z.string().max(200).nullable().optional(),
  reservedEventState: z.string().max(10).nullable().optional(),
});

export const promoCodeUpdateSchema = z.object({
  status: promoStatusEnum.optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  internalNotes: z.string().max(5000).nullable().optional(),
  reservedOrganizationName: z.string().max(200).nullable().optional(),
  reservedEventName: z.string().max(200).nullable().optional(),
  reservedEventState: z.string().max(10).nullable().optional(),
});

export const promoCodeBulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
  status: promoStatusEnum,
});

export const promoCodeRedeemSchema = z.object({
  code: z.string().min(1).max(32),
});

export type PromoCodeBulkStatus = PlatformFeePromoCodeStatus;
