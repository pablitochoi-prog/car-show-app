import { z } from "zod";

export const createConnectedAccountSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID"),
  returnPath: z.string().max(500).optional(),
  origin: z.string().max(500).optional(),
});

export const createAccountLinkSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID"),
  returnPath: z.string().max(500).optional(),
  origin: z.string().max(500).optional(),
});

export const refreshStatusSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID"),
});

export const disconnectStripeSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID"),
});

export const createCheckoutSchema = z.object({
  registrationId: z.string().uuid("Invalid registration ID"),
  /** Required when charging an additional donation balance on a paid registration. */
  donationCents: z.number().int().min(0).optional(),
});

export const eventPaymentSettingsSchema = z.object({
  paymentEnabled: z.boolean(),
});
