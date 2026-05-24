import {
  calculateApplicationFee,
  type PlatformFeeConfig,
} from "@/lib/platform-fee-config";

export type EventPlatformFeeMode = "CONVENIENCE" | "FLAT_EVENT";

export type EventSetupFeeConfig = {
  amountCents: number;
};

export const DEFAULT_EVENT_SETUP_FEE: EventSetupFeeConfig = {
  amountCents: 7500,
};

export function formatEventSetupFeeLabel(amountCents: number): string {
  return `$${(amountCents / 100).toFixed(2)} per event`;
}

/** Platform fee config used for per-vehicle charges (NONE when flat event fee mode). */
export function effectivePlatformFeeConfig(
  mode: EventPlatformFeeMode,
  platformFee: PlatformFeeConfig,
): PlatformFeeConfig {
  if (mode === "FLAT_EVENT") {
    return { type: "NONE", amountCents: null, percent: null };
  }
  return platformFee;
}

/** Per-vehicle platform fee (convenience fee) when mode is CONVENIENCE. */
export function perVehiclePlatformFeeCents(
  mode: EventPlatformFeeMode,
  platformFee: PlatformFeeConfig,
  unitPriceCents: number,
): number {
  if (mode !== "CONVENIENCE") return 0;
  return calculateApplicationFee(platformFee, unitPriceCents);
}

/** One-time flat setup fee line item for the first paid checkout on an event. */
export function flatEventSetupFeeCents(
  mode: EventPlatformFeeMode,
  setupFeeCents: number,
  setupFeeCollected: boolean,
): number {
  if (mode !== "FLAT_EVENT" || setupFeeCollected || setupFeeCents <= 0) return 0;
  return setupFeeCents;
}

export function totalPlatformFeeForCheckout(input: {
  mode: EventPlatformFeeMode;
  platformFee: PlatformFeeConfig;
  unitPriceCents: number;
  vehicleCount: number;
  setupFeeCents: number;
  setupFeeCollected: boolean;
}): {
  perVehiclePlatformFeeCents: number;
  flatSetupFeeCents: number;
  totalApplicationFeeCents: number;
} {
  const count = Math.max(input.vehicleCount, 1);
  const perVehicle = perVehiclePlatformFeeCents(
    input.mode,
    input.platformFee,
    input.unitPriceCents,
  );
  const flatSetup = flatEventSetupFeeCents(
    input.mode,
    input.setupFeeCents,
    input.setupFeeCollected,
  );

  return {
    perVehiclePlatformFeeCents: perVehicle,
    flatSetupFeeCents: flatSetup,
    totalApplicationFeeCents: perVehicle * count + flatSetup,
  };
}

export type EventPlatformFeePaidInput = {
  /** When false, platform billing is not active for this event yet. */
  paymentEnabled: boolean;
  platformFeeMode: EventPlatformFeeMode;
  platformSetupFeeCollected: boolean;
  /** At least one registration completed Stripe checkout (convenience fee path). */
  hasCompletedPaidCheckout: boolean;
};

/** True when the organizer has satisfied the platform licensing fee for this event. */
export function isEventPlatformFeePaid(input: EventPlatformFeePaidInput): boolean {
  if (!input.paymentEnabled) return true;

  if (input.platformFeeMode === "FLAT_EVENT") {
    return input.platformSetupFeeCollected;
  }

  return input.hasCompletedPaidCheckout;
}

export const FLAT_PLATFORM_FEE_UNPAID_LISTING_MESSAGE =
  "You selected the Flat Platform Fee option for your event. Before publishing the event or scheduling it to be published, you must make the Platform Fee payment.";

/** True when publish/schedule must be blocked until the flat platform fee is paid. */
export function requiresFlatPlatformFeePaymentBeforeListing(input: {
  platformFeeMode: EventPlatformFeeMode;
  platformSetupFeeCollected: boolean;
}): boolean {
  return (
    input.platformFeeMode === "FLAT_EVENT" && !input.platformSetupFeeCollected
  );
}

export function dashCardsBlockedMessage(platformFeeMode: EventPlatformFeeMode): string {
  if (platformFeeMode === "FLAT_EVENT") {
    return "The flat platform fee must be paid before printing dash cards. It is collected on the first online registration payment for this event.";
  }
  return "Platform convenience fees must be collected before printing dash cards. At least one registrant must complete an online payment.";
}
