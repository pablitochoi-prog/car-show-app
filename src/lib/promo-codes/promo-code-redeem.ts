import type { PrismaClient } from "@prisma/client";
import {
  isValidPromoCodeFormat,
  normalizePromoCodeInput,
  PROMO_CODE_LENGTH,
} from "./promo-code-charset";
import {
  effectivePromoStatus,
  REDEEMABLE_PROMO_STATUSES,
} from "./promo-code-status";

export const PROMO_REDEEM_INVALID_MESSAGE =
  "This promo code is not valid or is no longer available.";

export const PROMO_REDEEM_SUCCESS_MESSAGE =
  "Promo code applied. Your flat platform fee is covered for this event.";

export type RedeemPlatformFeePromoInput = {
  eventId: string;
  rawCode: string;
  userId: string;
};

export type RedeemPlatformFeePromoResult =
  | { ok: true; promoCodeId: string; codeLast4: string }
  | { ok: false; error: string };

export async function redeemPlatformFeePromoCode(
  prisma: PrismaClient,
  input: RedeemPlatformFeePromoInput,
): Promise<RedeemPlatformFeePromoResult> {
  const normalized = normalizePromoCodeInput(input.rawCode);
  if (!normalized || normalized.length !== PROMO_CODE_LENGTH) {
    return { ok: false, error: PROMO_REDEEM_INVALID_MESSAGE };
  }
  if (!isValidPromoCodeFormat(normalized)) {
    return { ok: false, error: PROMO_REDEEM_INVALID_MESSAGE };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: input.eventId },
        select: {
          id: true,
          name: true,
          state: true,
          platformFeeMode: true,
          platformSetupFeeCollected: true,
          platformFeePromoCodeId: true,
          organization: { select: { name: true, stripeChargesEnabled: true } },
        },
      });

      if (!event) {
        return { ok: false, error: PROMO_REDEEM_INVALID_MESSAGE };
      }

      if (event.platformFeeMode !== "FLAT_EVENT") {
        return { ok: false, error: PROMO_REDEEM_INVALID_MESSAGE };
      }

      if (
        event.platformSetupFeeCollected ||
        event.platformFeePromoCodeId
      ) {
        return { ok: false, error: PROMO_REDEEM_INVALID_MESSAGE };
      }

      if (!event.organization?.stripeChargesEnabled) {
        return { ok: false, error: PROMO_REDEEM_INVALID_MESSAGE };
      }

      const promo = await tx.platformFeePromoCode.findUnique({
        where: { code: normalized },
      });

      if (!promo || promo.redeemedAt || promo.redeemedEventId) {
        return { ok: false, error: PROMO_REDEEM_INVALID_MESSAGE };
      }

      const status = effectivePromoStatus({
        status: promo.status,
        expiresAt: promo.expiresAt,
      });

      if (!REDEEMABLE_PROMO_STATUSES.includes(status)) {
        return { ok: false, error: PROMO_REDEEM_INVALID_MESSAGE };
      }

      const now = new Date();
      const orgName = event.organization?.name ?? null;

      const updated = await tx.platformFeePromoCode.updateMany({
        where: {
          id: promo.id,
          code: normalized,
          status: "ACTIVE",
          redeemedAt: null,
          redeemedEventId: null,
        },
        data: {
          status: "REDEEMED",
          redeemedAt: now,
          redeemedByUserId: input.userId,
          redeemedEventId: event.id,
          redeemedOrganizationName: orgName,
          redeemedEventName: event.name,
          redeemedEventState: event.state,
          updatedByUserId: input.userId,
        },
      });

      if (updated.count !== 1) {
        return { ok: false, error: PROMO_REDEEM_INVALID_MESSAGE };
      }

      await tx.event.update({
        where: { id: event.id },
        data: {
          platformSetupFeeCollected: true,
          platformFeePromoCodeId: promo.id,
          paymentEnabled: true,
        },
      });

      return {
        ok: true,
        promoCodeId: promo.id,
        codeLast4: normalized.slice(-4),
      };
    });
  } catch {
    return { ok: false, error: PROMO_REDEEM_INVALID_MESSAGE };
  }
}
