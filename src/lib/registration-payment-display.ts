import type {
  PaymentStatus,
  RegistrationFeeType,
  RegistrationStatus,
} from "@prisma/client";
import { formatMoney } from "@/components/registration/reg-utils";
import {
  donationPlatformFeeTotalCents,
  getDonationAmountCentsFromPaidRegistration,
  resolveDonationUnitCents,
} from "@/lib/donation";
import {
  calculateApplicationFee,
  type PlatformFeeConfig,
} from "@/lib/platform-fee-config";
import type { EventPlatformFeeMode } from "@/lib/event-platform-fee";

export type RegistrationPaymentDisplay = {
  kind: "complete" | "due";
  label: string;
};

export type RegistrationDisplayStatus = {
  label: string;
  variant: "success" | "warning" | "danger" | "muted";
};

export type RegistrationAmounts = {
  amountPaidCents: number;
  amountDueCents: number;
};

/** Total registration amount in cents (tier × vehicles + convenience fees). */
export function computeRegistrationAmountDueCents(
  tierPriceCents: number,
  vehicleCount: number,
  platformFee: PlatformFeeConfig,
): number {
  if (tierPriceCents <= 0) return 0;
  const count = Math.max(vehicleCount, 1);
  const perVehicleFee = calculateApplicationFee(platformFee, tierPriceCents);
  return tierPriceCents * count + perVehicleFee * count;
}

/** Total due including donation platform fees when applicable. */
export function computeRegistrationTotalDueCents(input: {
  registrationFeeType: RegistrationFeeType;
  unitPriceCents: number;
  vehicleCount: number;
  platformFee: PlatformFeeConfig;
  suggestedDonationPerVehicleDollars?: number | null;
  platformFeeMode?: EventPlatformFeeMode;
  eventSetupFeeCents?: number;
  platformSetupFeeCollected?: boolean;
}): number {
  const {
    registrationFeeType,
    unitPriceCents,
    vehicleCount,
    platformFee,
    suggestedDonationPerVehicleDollars,
    platformFeeMode = "CONVENIENCE",
    eventSetupFeeCents = 0,
    platformSetupFeeCollected = false,
  } = input;
  const count = Math.max(vehicleCount, 1);
  const perVehicleFeeConfig =
    platformFeeMode === "FLAT_EVENT"
      ? { type: "NONE" as const, amountCents: null, percent: null }
      : platformFee;

  let total = 0;
  if (registrationFeeType === "DONATION") {
    if (unitPriceCents <= 0) return 0;
    const { totalCents: platformTotal } = donationPlatformFeeTotalCents(
      (unit) => calculateApplicationFee(perVehicleFeeConfig, unit),
      suggestedDonationPerVehicleDollars ?? 0,
      count,
    );
    total = unitPriceCents + platformTotal;
  } else {
    total = computeRegistrationAmountDueCents(
      unitPriceCents,
      vehicleCount,
      perVehicleFeeConfig,
    );
  }

  if (
    platformFeeMode === "FLAT_EVENT" &&
    !platformSetupFeeCollected &&
    eventSetupFeeCents > 0
  ) {
    total += eventSetupFeeCents;
  }

  return total;
}

/** Per-vehicle charge (tier + convenience fee) for tiered paid events. */
export function perVehicleRegistrationChargeCents(
  unitPriceCents: number,
  platformFee: PlatformFeeConfig,
): number {
  if (unitPriceCents <= 0) return 0;
  return unitPriceCents + calculateApplicationFee(platformFee, unitPriceCents);
}

/** Infer how many vehicles were covered by the last payment total. */
export function derivePaidVehicleCount(input: {
  amountPaidCents: number;
  unitPriceCents: number;
  platformFee: PlatformFeeConfig;
  platformFeeMode?: EventPlatformFeeMode;
  eventSetupFeeCents?: number;
}): number {
  const {
    amountPaidCents,
    unitPriceCents,
    platformFee,
    platformFeeMode = "CONVENIENCE",
    eventSetupFeeCents = 0,
  } = input;
  if (amountPaidCents <= 0) return 0;

  if (platformFeeMode === "FLAT_EVENT" && unitPriceCents > 0) {
    const setupFee = eventSetupFeeCents;
    if (setupFee > 0 && amountPaidCents >= setupFee + unitPriceCents) {
      const afterSetup = amountPaidCents - setupFee;
      if (afterSetup % unitPriceCents === 0) {
        return Math.max(1, afterSetup / unitPriceCents);
      }
    }
    if (amountPaidCents % unitPriceCents === 0) {
      return Math.max(1, amountPaidCents / unitPriceCents);
    }
    return Math.max(1, Math.round(amountPaidCents / unitPriceCents));
  }

  const perVehicle = perVehicleRegistrationChargeCents(
    unitPriceCents,
    platformFee,
  );
  if (perVehicle <= 0) return 1;
  return Math.max(1, Math.round(amountPaidCents / perVehicle));
}

export type AdditionalBalanceCheckout = {
  amountDueCents: number;
  additionalVehicleCount: number;
  tierPriceCents: number;
  perVehiclePlatformFeeCents: number;
  totalApplicationFee: number;
};

export type AdditionalDonationBalanceCheckout = {
  amountDueCents: number;
  donationDeltaCents: number;
  platformDeltaCents: number;
  perVehiclePlatformFeeCents: number;
  additionalPlatformFeeVehicleCount: number;
  totalApplicationFee: number;
};

export const DONATION_DECREASE_AFTER_PAYMENT_MSG =
  "You cannot reduce your donation below the amount already paid. Contact the organizer if you need assistance.";

/** Line-item breakdown for paying the balance after adding vehicles post-payment. */
export function computeAdditionalBalanceCheckout(input: {
  unitPriceCents: number;
  vehicleCount: number;
  amountPaidCents: number;
  platformFee: PlatformFeeConfig;
}): AdditionalBalanceCheckout | null {
  const { unitPriceCents, vehicleCount, amountPaidCents, platformFee } = input;
  if (unitPriceCents <= 0 || vehicleCount <= 0 || amountPaidCents <= 0) {
    return null;
  }

  const totalObligationCents = computeRegistrationAmountDueCents(
    unitPriceCents,
    vehicleCount,
    platformFee,
  );
  const amountDueCents = Math.max(0, totalObligationCents - amountPaidCents);
  if (amountDueCents <= 0) return null;

  const paidVehicleCount = derivePaidVehicleCount({
    amountPaidCents,
    unitPriceCents,
    platformFee,
  });
  const additionalVehicleCount = Math.max(
    1,
    vehicleCount - paidVehicleCount,
  );
  const perVehiclePlatformFeeCents = calculateApplicationFee(
    platformFee,
    unitPriceCents,
  );
  const totalApplicationFee =
    perVehiclePlatformFeeCents * additionalVehicleCount;

  return {
    amountDueCents,
    additionalVehicleCount,
    tierPriceCents: unitPriceCents,
    perVehiclePlatformFeeCents,
    totalApplicationFee,
  };
}

/** Validates donation is not below what was already paid (donation portion only). */
export function validateDonationNotDecreasedAfterPayment(input: {
  newDonationCents: number;
  amountPaidCents: number;
  platformFeeCentsPaid: number | null;
}): string | null {
  const paidDonationCents = resolveDonationUnitCents(
    input.amountPaidCents,
    input.platformFeeCentsPaid,
  );
  if (input.newDonationCents < paidDonationCents) {
    return DONATION_DECREASE_AFTER_PAYMENT_MSG;
  }
  return null;
}

/** Stripe line items for paying a higher donation and/or more vehicles after initial payment. */
export function computeAdditionalDonationBalanceCheckout(input: {
  donationCents: number;
  vehicleCount: number;
  amountPaidCents: number;
  platformFeeCentsPaid: number | null;
  platformFee: PlatformFeeConfig;
  suggestedDonationPerVehicleDollars?: number | null;
}): AdditionalDonationBalanceCheckout | null {
  const {
    donationCents,
    vehicleCount,
    amountPaidCents,
    platformFeeCentsPaid,
    platformFee,
    suggestedDonationPerVehicleDollars,
  } = input;

  if (donationCents <= 0 || vehicleCount <= 0 || amountPaidCents <= 0) {
    return null;
  }

  const newTotalObligationCents = computeRegistrationTotalDueCents({
    registrationFeeType: "DONATION",
    unitPriceCents: donationCents,
    vehicleCount,
    platformFee,
    suggestedDonationPerVehicleDollars,
  });

  const amountDueCents = newTotalObligationCents - amountPaidCents;
  if (amountDueCents <= 0) return null;

  const paidDonationCents = resolveDonationUnitCents(
    amountPaidCents,
    platformFeeCentsPaid,
  );
  const donationDeltaCents = Math.max(0, donationCents - paidDonationCents);

  const { totalCents: newPlatformTotal, perVehicleCents: perVehiclePlatformFeeCents } =
    donationPlatformFeeTotalCents(
      (unit) => calculateApplicationFee(platformFee, unit),
      suggestedDonationPerVehicleDollars,
      vehicleCount,
    );
  const oldPlatformTotal = platformFeeCentsPaid ?? 0;
  const platformDeltaCents = Math.max(0, newPlatformTotal - oldPlatformTotal);
  const additionalPlatformFeeVehicleCount =
    perVehiclePlatformFeeCents > 0
      ? Math.round(platformDeltaCents / perVehiclePlatformFeeCents)
      : 0;

  return {
    amountDueCents,
    donationDeltaCents,
    platformDeltaCents,
    perVehiclePlatformFeeCents,
    additionalPlatformFeeVehicleCount,
    totalApplicationFee: platformDeltaCents,
  };
}

export function getRegistrationAmounts(input: {
  registrationFeeType: RegistrationFeeType;
  unitPriceCents: number;
  vehicleCount: number;
  registrationStatus: RegistrationStatus;
  paymentStatus: PaymentStatus | null;
  amountCents: number | null;
  platformFeeCents: number | null;
  refundedCents?: number | null;
  platformFee: PlatformFeeConfig;
  suggestedDonationPerVehicleDollars?: number | null;
  platformFeeMode?: EventPlatformFeeMode;
  eventSetupFeeCents?: number;
  platformSetupFeeCollected?: boolean;
}): RegistrationAmounts {
  const {
    registrationStatus,
    paymentStatus,
    amountCents,
    platformFeeCents,
    refundedCents,
  } = input;

  if (registrationStatus === "CANCELLED") {
    return { amountPaidCents: 0, amountDueCents: 0 };
  }

  let donationUnitCents = input.unitPriceCents;
  const perVehicleFeeConfig =
    input.platformFeeMode === "FLAT_EVENT"
      ? { type: "NONE" as const, amountCents: null, percent: null }
      : input.platformFee;

  if (
    input.registrationFeeType === "DONATION" &&
    paymentStatus === "PAID" &&
    (amountCents ?? 0) > 0
  ) {
    const fromPayment = getDonationAmountCentsFromPaidRegistration({
      amountPaidCents: amountCents!,
      platformFeeCentsPaid: platformFeeCents,
      vehicleCount: input.vehicleCount,
      perVehiclePlatformFeeFn: (unit) =>
        calculateApplicationFee(perVehicleFeeConfig, unit),
      suggestedDonationPerVehicleDollars:
        input.suggestedDonationPerVehicleDollars,
    });
    // Some callers pass the full Stripe charge as unitPriceCents (not the donation).
    if (
      Math.abs(donationUnitCents - amountCents!) <= (platformFeeCents ?? 0)
    ) {
      donationUnitCents = fromPayment;
    }
  }

  const totalObligationCents = computeRegistrationTotalDueCents({
    registrationFeeType: input.registrationFeeType,
    unitPriceCents: donationUnitCents,
    vehicleCount: input.vehicleCount,
    platformFee: input.platformFee,
    suggestedDonationPerVehicleDollars: input.suggestedDonationPerVehicleDollars,
    platformFeeMode: input.platformFeeMode,
    eventSetupFeeCents: input.eventSetupFeeCents,
    platformSetupFeeCollected: input.platformSetupFeeCollected,
  });

  let amountPaidCents = 0;
  if (paymentStatus === "PAID") {
    // Checkout stores the full charge (tier/donation + fees) in amountCents.
    const storedPaid = amountCents ?? 0;
    amountPaidCents = storedPaid > 0 ? storedPaid : totalObligationCents;
    const refunded = Math.max(0, refundedCents ?? 0);
    amountPaidCents = Math.max(0, amountPaidCents - refunded);
  }

  const amountDueCents = Math.max(0, totalObligationCents - amountPaidCents);

  return { amountPaidCents, amountDueCents };
}

/** User-facing registration status with badge color. */
export function getRegistrationDisplayStatus(input: {
  registrationStatus: RegistrationStatus;
  paymentStatus: PaymentStatus | null;
  amountDueCents: number;
}): RegistrationDisplayStatus {
  const { registrationStatus, paymentStatus, amountDueCents } = input;

  if (registrationStatus === "CANCELLED") {
    return { label: "Cancelled", variant: "muted" };
  }

  if (
    amountDueCents <= 0 &&
    (paymentStatus === "PAID" || registrationStatus === "CONFIRMED")
  ) {
    return { label: "Confirmed / Paid", variant: "success" };
  }

  if (paymentStatus === "PENDING" || paymentStatus === "FAILED") {
    return { label: "Pending", variant: "danger" };
  }

  if (registrationStatus === "PENDING" && amountDueCents > 0) {
    return { label: "Registration submitted", variant: "warning" };
  }

  return { label: "Pending", variant: "danger" };
}

export function formatRegistrationAmounts(amounts: RegistrationAmounts): {
  amountPaid: string;
  amountDue: string;
} {
  return {
    amountPaid: formatMoney(amounts.amountPaidCents),
    amountDue: formatMoney(amounts.amountDueCents),
  };
}

export function getRegistrationPaymentDisplay(input: {
  tierPriceCents: number;
  vehicleCount: number;
  registrationStatus: RegistrationStatus;
  paymentStatus: PaymentStatus | null;
  amountCents: number | null;
  platformFee: PlatformFeeConfig;
}): RegistrationPaymentDisplay | null {
  const {
    tierPriceCents,
    vehicleCount,
    registrationStatus,
    paymentStatus,
    amountCents,
    platformFee,
  } = input;

  if (registrationStatus === "CANCELLED") return null;

  if (tierPriceCents <= 0 || paymentStatus === "PAID") {
    return { kind: "complete", label: "Payment complete" };
  }

  const paymentPending =
    registrationStatus === "PENDING" ||
    paymentStatus === "PENDING" ||
    paymentStatus === "FAILED";

  if (!paymentPending) {
    return { kind: "complete", label: "Payment complete" };
  }

  const dueCents =
    amountCents ??
    computeRegistrationAmountDueCents(
      tierPriceCents,
      vehicleCount,
      platformFee,
    );

  return {
    kind: "due",
    label: `Amount due: ${formatMoney(dueCents)}`,
  };
}
