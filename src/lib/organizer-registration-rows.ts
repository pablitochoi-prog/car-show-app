import type {
  PaymentStatus,
  RegistrationFeeType,
  RegistrationStatus,
} from "@prisma/client";
import { resolveRegistrationContact } from "@/lib/registration-contact";
import {
  getRegistrationDisplayStatus,
  type RegistrationDisplayStatus,
} from "@/lib/registration-payment-display";
import type { PlatformFeeConfig } from "@/lib/platform-fee-config";
import { computeRegistrationMoneyDisplay } from "@/lib/registration-row-money";

export type OrganizerRegistrationRow = {
  id: string;
  userId: string | null;
  status: RegistrationStatus;
  paymentStatus: PaymentStatus | null;
  isGuest: boolean;
  name: string;
  email: string;
  tierName: string;
  vehicleCount: number;
  registrationFeeCents: number;
  amountDueCents: number;
  clubFeeCents: number;
  clubCollectedCents: number;
  clubDueCents: number;
  platformDueCents: number;
  regFeeDisplay: string;
  amountCollectedDisplay: string;
  amountDueDisplay: string;
  displayStatus: RegistrationDisplayStatus;
  createdAt: string;
};

/** Serializable registration input (server → client). */
export type OrganizerRegistrationInput = {
  id: string;
  userId: string | null;
  status: RegistrationStatus;
  paymentStatus: PaymentStatus | null;
  amountCents: number | null;
  platformFeeCents: number | null;
  refundedCents: number;
  createdAt: string;
  tierName: string;
  tierPriceCents: number;
  vehicles: { id: string }[];
  guestVehicles: unknown;
  user: {
    name: string;
    email: string;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    status: string;
  } | null;
  guestFirstName: string | null;
  guestLastName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  registrantFirstName: string | null;
  registrantLastName: string | null;
  registrantEmail: string | null;
  registrantPhone: string | null;
};

export function buildOrganizerRegistrationRow(
  r: OrganizerRegistrationInput,
  event: {
    registrationFeeType: RegistrationFeeType;
    suggestedDonationPerVehicleDollars?: number | null;
  },
  platformFee: PlatformFeeConfig,
): OrganizerRegistrationRow {
  const resolved = resolveRegistrationContact(r);
  const money = computeRegistrationMoneyDisplay(
    {
      status: r.status,
      paymentStatus: r.paymentStatus,
      amountCents: r.amountCents,
      platformFeeCents: r.platformFeeCents,
      refundedCents: r.refundedCents,
      tier: { priceCents: Number(r.tierPriceCents) || 0 },
      vehicles: r.vehicles,
      guestVehicles: r.guestVehicles,
    },
    event,
    platformFee,
  );

  const displayStatus = getRegistrationDisplayStatus({
    registrationStatus: r.status,
    paymentStatus: r.paymentStatus,
    amountDueCents: money.totalDueCents,
  });

  return {
    id: r.id,
    userId: r.userId,
    status: r.status,
    paymentStatus: r.paymentStatus,
    isGuest: !r.user,
    name: resolved.name,
    email: resolved.email,
    tierName: r.tierName,
    vehicleCount: money.vehicleCount,
    registrationFeeCents: money.registrationFeeCents,
    amountDueCents: money.amountDueCents,
    clubFeeCents: money.clubFeeCents,
    clubCollectedCents: money.clubCollectedCents,
    clubDueCents: money.clubDueCents,
    platformDueCents: money.platformDueCents,
    regFeeDisplay: money.regFeeDisplay,
    amountCollectedDisplay: money.amountCollectedDisplay,
    amountDueDisplay: money.amountDueDisplay,
    displayStatus,
    createdAt: r.createdAt,
  };
}

export function buildOrganizerRegistrationRows(
  inputs: OrganizerRegistrationInput[],
  event: {
    registrationFeeType: RegistrationFeeType;
    suggestedDonationPerVehicleDollars?: number | null;
  },
  platformFee: PlatformFeeConfig,
): OrganizerRegistrationRow[] {
  return inputs.map((r) => buildOrganizerRegistrationRow(r, event, platformFee));
}
