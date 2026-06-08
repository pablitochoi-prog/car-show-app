import type { PlatformFeePromoCodeStatus } from "@prisma/client";

export const PROMO_CODE_STATUS_LABELS: Record<
  PlatformFeePromoCodeStatus,
  string
> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  RESERVED: "Reserved",
  REDEEMED: "Redeemed",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
  ARCHIVED: "Archived",
};

/** Statuses organizers may redeem (Phase 1: ACTIVE only). */
export const REDEEMABLE_PROMO_STATUSES: PlatformFeePromoCodeStatus[] = [
  "ACTIVE",
];

const BULK_STATUS_TRANSITIONS: Partial<
  Record<PlatformFeePromoCodeStatus, PlatformFeePromoCodeStatus[]>
> = {
  DRAFT: ["ACTIVE", "ARCHIVED", "EXPIRED"],
  ACTIVE: ["REVOKED", "ARCHIVED", "EXPIRED"],
  REVOKED: ["ACTIVE", "EXPIRED"],
  RESERVED: ["EXPIRED", "ARCHIVED"],
  EXPIRED: ["ARCHIVED", "ACTIVE"],
};

export function isBulkStatusTransitionAllowed(
  from: PlatformFeePromoCodeStatus,
  to: PlatformFeePromoCodeStatus,
): boolean {
  if (from === "REDEEMED") return to === "ARCHIVED";
  const allowed = BULK_STATUS_TRANSITIONS[from];
  return allowed?.includes(to) ?? false;
}

export function bulkStatusTransitionError(
  from: PlatformFeePromoCodeStatus,
  to: PlatformFeePromoCodeStatus,
): string | null {
  if (from === to) return "Status is already set.";
  if (from === "REDEEMED" && to === "ACTIVE") {
    return "Redeemed promo codes cannot be reactivated.";
  }
  if (from === "ARCHIVED" && to === "ACTIVE") {
    return "Archived promo codes cannot be bulk-activated. Edit individually with confirmation.";
  }
  if (to === "EXPIRED") {
    if (from === "REDEEMED" || from === "ARCHIVED") {
      return `Cannot change status from ${PROMO_CODE_STATUS_LABELS[from]} to ${PROMO_CODE_STATUS_LABELS[to]}.`;
    }
    return null;
  }
  if (!isBulkStatusTransitionAllowed(from, to)) {
    return `Cannot change status from ${PROMO_CODE_STATUS_LABELS[from]} to ${PROMO_CODE_STATUS_LABELS[to]}.`;
  }
  return null;
}

/** Individual admin edit (PATCH) — admins may manually expire most codes. */
export function adminManualStatusTransitionError(
  from: PlatformFeePromoCodeStatus,
  to: PlatformFeePromoCodeStatus,
): string | null {
  if (from === to) return "Status is already set.";

  if (from === "REDEEMED") {
    if (to === "ACTIVE") {
      return "Redeemed promo codes cannot be reactivated.";
    }
    if (to !== "ARCHIVED") {
      return "Redeemed promo codes can only be archived.";
    }
    return null;
  }

  if (to === "EXPIRED") {
    if (from === "ARCHIVED") {
      return `Cannot change status from ${PROMO_CODE_STATUS_LABELS[from]} to ${PROMO_CODE_STATUS_LABELS[to]}.`;
    }
    return null;
  }

  return bulkStatusTransitionError(from, to);
}

export function isPromoCodeExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() <= Date.now();
}

export function effectivePromoStatus(input: {
  status: PlatformFeePromoCodeStatus;
  expiresAt: Date | null;
}): PlatformFeePromoCodeStatus {
  if (
    input.status === "ACTIVE" &&
    isPromoCodeExpired(input.expiresAt)
  ) {
    return "EXPIRED";
  }
  return input.status;
}
