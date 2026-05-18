import type {
  PaymentStatus,
  RegistrationFeeType,
  RegistrationStatus,
} from "@prisma/client";
import {
  computeRegistrationTotalDueCents,
  getRegistrationAmounts,
} from "@/lib/registration-payment-display";
import {
  calculateApplicationFee,
  type PlatformFeeConfig,
} from "@/lib/platform-fee-config";
import {
  donationPlatformFeeTotalCents,
  resolveDonationUnitCents,
  suggestedDonationPerVehicleDollars,
} from "@/lib/donation";
import { formatMoney } from "@/lib/format-money";
import { applyClubRefundAdjustments } from "@/lib/registration-refund-adjustments";

type GuestVehicle = { year?: number; make?: string; model?: string; trim?: string };

export function countRegistrationVehicles(input: {
  linkedCount: number;
  guestVehicles: unknown;
}): number {
  const guestList: GuestVehicle[] = Array.isArray(input.guestVehicles)
    ? (input.guestVehicles as GuestVehicle[])
    : [];
  const total = input.linkedCount + guestList.length;
  return Math.max(total, 1);
}

export type RegistrationMoneyDisplay = {
  vehicleCount: number;
  /** Club revenue (excludes platform convenience fees). */
  clubFeeCents: number;
  /** Club portion received (paid registrations only). */
  clubCollectedCents: number;
  /** Unpaid club portion (for subtotals). */
  clubDueCents: number;
  /** Unpaid platform convenience fees (not in club subtotals). */
  platformDueCents: number;
  /** Club + platform still owed (for status badges). */
  totalDueCents: number;
  /** Legacy sort keys — club amounts only. */
  registrationFeeCents: number;
  amountDueCents: number;
  regFeeDisplay: string;
  amountCollectedDisplay: string;
  amountDueDisplay: string;
};

/** Club revenue collected (excludes platform convenience fees). */
function computeClubCollectedCents(
  r: {
    status: RegistrationStatus;
    paymentStatus: PaymentStatus | null;
    amountCents: number | null;
    platformFeeCents: number | null;
    tier: { priceCents: number };
  },
  event: { registrationFeeType: RegistrationFeeType },
  vehicleCount: number,
): number {
  if (r.status === "CANCELLED" || r.paymentStatus !== "PAID") {
    return 0;
  }

  if (event.registrationFeeType === "DONATION") {
    return resolveDonationUnitCents(r.amountCents ?? 0, r.platformFeeCents);
  }

  const stored = r.amountCents ?? 0;
  const platform = r.platformFeeCents ?? 0;
  if (stored > platform && stored > 0) {
    return stored - platform;
  }

  return r.tier.priceCents * vehicleCount;
}

function formatAmountDueWithPlatform(
  clubDueCents: number,
  platformDueCents: number,
): string {
  if (clubDueCents <= 0 && platformDueCents <= 0) {
    return formatMoney(0);
  }
  if (platformDueCents <= 0) {
    return formatMoney(clubDueCents);
  }
  return `${formatMoney(clubDueCents)} (+${formatMoney(platformDueCents)})`;
}

function suggestedDonationLabel(
  suggestedPerVehicleDollars: number | null | undefined,
  vehicleCount: number,
): string {
  const perVehicle = suggestedDonationPerVehicleDollars(suggestedPerVehicleDollars);
  if (perVehicle <= 0) {
    return "Suggested donation";
  }
  const vehicleWord = vehicleCount === 1 ? "vehicle" : "vehicles";
  return `Suggested ${formatMoney(Math.round(perVehicle * 100))} × ${vehicleCount} ${vehicleWord}`;
}

function withRefundAdjustments(
  clubFeeCents: number,
  clubCollectedCents: number,
  refundedCents: number | null | undefined,
): { clubFeeCents: number; clubCollectedCents: number } {
  return applyClubRefundAdjustments(
    clubFeeCents,
    clubCollectedCents,
    refundedCents ?? 0,
  );
}

export function computeRegistrationMoneyDisplay(
  r: {
    status: RegistrationStatus;
    paymentStatus: PaymentStatus | null;
    amountCents: number | null;
    platformFeeCents: number | null;
    refundedCents?: number | null;
    tier: { priceCents: number };
    vehicles: { id: string }[];
    guestVehicles: unknown;
  },
  event: {
    registrationFeeType: RegistrationFeeType;
    suggestedDonationPerVehicleDollars?: number | null;
  },
  platformFee: PlatformFeeConfig,
): RegistrationMoneyDisplay {
  const vehicleCount = countRegistrationVehicles({
    linkedCount: r.vehicles.length,
    guestVehicles: r.guestVehicles,
  });

  if (r.status === "CANCELLED") {
    return {
      vehicleCount,
      clubFeeCents: 0,
      clubCollectedCents: 0,
      clubDueCents: 0,
      platformDueCents: 0,
      totalDueCents: 0,
      registrationFeeCents: 0,
      amountDueCents: 0,
      regFeeDisplay: formatMoney(0),
      amountCollectedDisplay: formatMoney(0),
      amountDueDisplay: formatMoney(0),
    };
  }

  const isPaid = r.paymentStatus === "PAID";
  const isDonation = event.registrationFeeType === "DONATION";

  if (isDonation) {
    const suggestedLabel = suggestedDonationLabel(
      event.suggestedDonationPerVehicleDollars,
      vehicleCount,
    );

    if (!isPaid) {
      const unitCents = Math.round(
        suggestedDonationPerVehicleDollars(
          event.suggestedDonationPerVehicleDollars,
        ) * 100,
      );
      const { totalCents: platformDueCents } = donationPlatformFeeTotalCents(
        (u) => calculateApplicationFee(platformFee, u),
        event.suggestedDonationPerVehicleDollars,
        vehicleCount,
      );
      const suggestedClubCents = unitCents * vehicleCount;

      return {
        vehicleCount,
        clubFeeCents: 0,
        clubCollectedCents: 0,
        clubDueCents: suggestedClubCents,
        platformDueCents,
        totalDueCents: suggestedClubCents + platformDueCents,
        registrationFeeCents: 0,
        amountDueCents: suggestedClubCents,
        regFeeDisplay: suggestedLabel,
        amountCollectedDisplay: formatMoney(0),
        amountDueDisplay: suggestedLabel,
      };
    }

    const donationCents = resolveDonationUnitCents(
      r.amountCents ?? 0,
      r.platformFeeCents,
    );
    const adjusted = withRefundAdjustments(
      donationCents,
      donationCents,
      r.refundedCents,
    );

    return {
      vehicleCount,
      clubFeeCents: adjusted.clubFeeCents,
      clubCollectedCents: adjusted.clubCollectedCents,
      clubDueCents: 0,
      platformDueCents: 0,
      totalDueCents: 0,
      registrationFeeCents: adjusted.clubFeeCents,
      amountDueCents: 0,
      regFeeDisplay: formatMoney(adjusted.clubFeeCents),
      amountCollectedDisplay: formatMoney(adjusted.clubCollectedCents),
      amountDueDisplay: formatMoney(0),
    };
  }

  const clubFeeCents = r.tier.priceCents * vehicleCount;

  if (isPaid) {
    const clubCollectedCents = computeClubCollectedCents(
      r,
      event,
      vehicleCount,
    );
    const adjusted = withRefundAdjustments(
      clubFeeCents,
      clubCollectedCents,
      r.refundedCents,
    );
    return {
      vehicleCount,
      clubFeeCents: adjusted.clubFeeCents,
      clubCollectedCents: adjusted.clubCollectedCents,
      clubDueCents: 0,
      platformDueCents: 0,
      totalDueCents: 0,
      registrationFeeCents: adjusted.clubFeeCents,
      amountDueCents: 0,
      regFeeDisplay: formatMoney(adjusted.clubFeeCents),
      amountCollectedDisplay: formatMoney(adjusted.clubCollectedCents),
      amountDueDisplay: formatMoney(0),
    };
  }

  const amounts = getRegistrationAmounts({
    registrationFeeType: event.registrationFeeType,
    unitPriceCents: r.tier.priceCents,
    vehicleCount,
    registrationStatus: r.status,
    paymentStatus: r.paymentStatus,
    amountCents: r.amountCents,
    platformFeeCents: r.platformFeeCents,
    platformFee,
    suggestedDonationPerVehicleDollars:
      event.suggestedDonationPerVehicleDollars ?? null,
  });

  const totalDueInclFees = computeRegistrationTotalDueCents({
    registrationFeeType: event.registrationFeeType,
    unitPriceCents: r.tier.priceCents,
    vehicleCount,
    platformFee,
    suggestedDonationPerVehicleDollars:
      event.suggestedDonationPerVehicleDollars ?? null,
  });

  const totalDueCents =
    amounts.amountDueCents > 0 ? amounts.amountDueCents : totalDueInclFees;

  const perVehiclePlatform = calculateApplicationFee(
    platformFee,
    r.tier.priceCents,
  );
  const platformDueCents = perVehiclePlatform * vehicleCount;
  const clubDueCents = Math.max(
    0,
    Math.min(clubFeeCents, totalDueCents - platformDueCents),
  );
  const platformShown = Math.max(
    0,
    Math.min(platformDueCents, totalDueCents - clubDueCents),
  );

  return {
    vehicleCount,
    clubFeeCents,
    clubCollectedCents: 0,
    clubDueCents,
    platformDueCents: platformShown,
    totalDueCents,
    registrationFeeCents: clubFeeCents,
    amountDueCents: clubDueCents,
    regFeeDisplay: formatMoney(clubFeeCents),
    amountCollectedDisplay: formatMoney(0),
    amountDueDisplay: formatAmountDueWithPlatform(clubDueCents, platformShown),
  };
}

/** @deprecated Use computeRegistrationMoneyDisplay */
export function computeRegistrationMoneyFields(
  r: Parameters<typeof computeRegistrationMoneyDisplay>[0],
  event: Parameters<typeof computeRegistrationMoneyDisplay>[1],
  platformFee: PlatformFeeConfig,
): {
  vehicleCount: number;
  registrationFeeCents: number;
  amountDueCents: number;
} {
  const d = computeRegistrationMoneyDisplay(r, event, platformFee);
  return {
    vehicleCount: d.vehicleCount,
    registrationFeeCents: d.registrationFeeCents,
    amountDueCents: d.amountDueCents,
  };
}

/** Club revenue collected (paid registrations), regardless of current status. */
export function registrationClubCollectedCents(
  r: {
    paymentStatus: PaymentStatus | null;
    amountCents: number | null;
    platformFeeCents: number | null;
    refundedCents?: number | null;
    tier: { priceCents: number };
    vehicles: { id: string }[];
    guestVehicles: unknown;
  },
  event: { registrationFeeType: RegistrationFeeType },
): number {
  if (r.paymentStatus !== "PAID") return 0;

  const vehicleCount = countRegistrationVehicles({
    linkedCount: r.vehicles.length,
    guestVehicles: r.guestVehicles,
  });

  const collected = computeClubCollectedCents(
    {
      status: "CONFIRMED",
      paymentStatus: "PAID",
      amountCents: r.amountCents,
      platformFeeCents: r.platformFeeCents,
      tier: r.tier,
    },
    event,
    vehicleCount,
  );

  return applyClubRefundAdjustments(
    collected,
    collected,
    r.refundedCents ?? 0,
  ).clubCollectedCents;
}
