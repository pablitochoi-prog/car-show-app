import type { PlatformFeePromoCodeStatus } from "@prisma/client";

export const PROMO_CODE_ACTIVE_VALIDITY_DAYS = 90;

/** Expiration for a newly activated promo code (90 days from `from`). */
export function activePromoCodeExpiresAt(from: Date = new Date()): Date {
  const expiresAt = new Date(from);
  expiresAt.setDate(expiresAt.getDate() + PROMO_CODE_ACTIVE_VALIDITY_DAYS);
  return expiresAt;
}

export function isBecomingActiveStatus(input: {
  previousStatus: PlatformFeePromoCodeStatus;
  nextStatus: PlatformFeePromoCodeStatus | undefined;
}): boolean {
  return input.nextStatus === "ACTIVE" && input.previousStatus !== "ACTIVE";
}

/**
 * When status is (or becomes) ACTIVE, default expiration to 90 days ahead unless
 * the caller explicitly sent `expiresAt` in the same request.
 * Also fills missing expiration on ACTIVE codes activated before this rule existed.
 */
export function expiredPromoCodeExpiresAt(now: Date = new Date()): Date {
  return new Date(now);
}

export function resolvePromoCodeExpiresAtUpdate(input: {
  previousStatus: PlatformFeePromoCodeStatus;
  nextStatus: PlatformFeePromoCodeStatus | undefined;
  explicitExpiresAt: string | null | undefined;
  currentExpiresAt?: Date | null;
  now?: Date;
}): Date | null | undefined {
  const now = input.now ?? new Date();

  if (input.nextStatus === "EXPIRED" && input.explicitExpiresAt === undefined) {
    return expiredPromoCodeExpiresAt(now);
  }

  if (input.nextStatus === "ACTIVE" && input.explicitExpiresAt === undefined) {
    if (isBecomingActiveStatus(input)) {
      return activePromoCodeExpiresAt(now);
    }
    if (input.previousStatus === "ACTIVE" && input.currentExpiresAt == null) {
      return activePromoCodeExpiresAt(now);
    }
  }

  if (input.explicitExpiresAt === undefined) {
    return undefined;
  }

  return input.explicitExpiresAt ? new Date(input.explicitExpiresAt) : null;
}
