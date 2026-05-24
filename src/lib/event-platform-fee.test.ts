import { describe, expect, it } from "vitest";
import {
  effectivePlatformFeeConfig,
  flatEventSetupFeeCents,
  isEventPlatformFeePaid,
  perVehiclePlatformFeeCents,
  requiresFlatPlatformFeePaymentBeforeListing,
  totalPlatformFeeForCheckout,
} from "@/lib/event-platform-fee";

const convenienceFee = {
  type: "FIXED" as const,
  amountCents: 50,
  percent: null,
};

describe("event-platform-fee", () => {
  it("charges per-vehicle convenience fee in CONVENIENCE mode", () => {
    const result = totalPlatformFeeForCheckout({
      mode: "CONVENIENCE",
      platformFee: convenienceFee,
      unitPriceCents: 5000,
      vehicleCount: 2,
      setupFeeCents: 7500,
      setupFeeCollected: false,
    });
    expect(result.perVehiclePlatformFeeCents).toBe(50);
    expect(result.flatSetupFeeCents).toBe(0);
    expect(result.totalApplicationFeeCents).toBe(100);
  });

  it("charges flat setup fee once in FLAT_EVENT mode", () => {
    const first = totalPlatformFeeForCheckout({
      mode: "FLAT_EVENT",
      platformFee: convenienceFee,
      unitPriceCents: 5000,
      vehicleCount: 3,
      setupFeeCents: 7500,
      setupFeeCollected: false,
    });
    expect(first.perVehiclePlatformFeeCents).toBe(0);
    expect(first.flatSetupFeeCents).toBe(7500);
    expect(first.totalApplicationFeeCents).toBe(7500);

    const afterCollected = totalPlatformFeeForCheckout({
      mode: "FLAT_EVENT",
      platformFee: convenienceFee,
      unitPriceCents: 5000,
      vehicleCount: 3,
      setupFeeCents: 7500,
      setupFeeCollected: true,
    });
    expect(afterCollected.flatSetupFeeCents).toBe(0);
    expect(afterCollected.totalApplicationFeeCents).toBe(0);
  });

  it("returns NONE config for per-vehicle fees in FLAT_EVENT mode", () => {
    expect(
      effectivePlatformFeeConfig("FLAT_EVENT", convenienceFee).type,
    ).toBe("NONE");
    expect(perVehiclePlatformFeeCents("FLAT_EVENT", convenienceFee, 5000)).toBe(
      0,
    );
    expect(flatEventSetupFeeCents("CONVENIENCE", 7500, false)).toBe(0);
  });
});

describe("requiresFlatPlatformFeePaymentBeforeListing", () => {
  it("blocks listing when flat fee mode is selected but unpaid", () => {
    expect(
      requiresFlatPlatformFeePaymentBeforeListing({
        platformFeeMode: "FLAT_EVENT",
        platformSetupFeeCollected: false,
      }),
    ).toBe(true);
    expect(
      requiresFlatPlatformFeePaymentBeforeListing({
        platformFeeMode: "FLAT_EVENT",
        platformSetupFeeCollected: true,
      }),
    ).toBe(false);
    expect(
      requiresFlatPlatformFeePaymentBeforeListing({
        platformFeeMode: "CONVENIENCE",
        platformSetupFeeCollected: false,
      }),
    ).toBe(false);
  });
});

describe("isEventPlatformFeePaid", () => {
  it("allows dash cards when platform billing is not enabled", () => {
    expect(
      isEventPlatformFeePaid({
        paymentEnabled: false,
        platformFeeMode: "FLAT_EVENT",
        platformSetupFeeCollected: false,
        hasCompletedPaidCheckout: false,
      }),
    ).toBe(true);
  });

  it("requires flat setup fee collected in FLAT_EVENT mode", () => {
    expect(
      isEventPlatformFeePaid({
        paymentEnabled: true,
        platformFeeMode: "FLAT_EVENT",
        platformSetupFeeCollected: false,
        hasCompletedPaidCheckout: false,
      }),
    ).toBe(false);
    expect(
      isEventPlatformFeePaid({
        paymentEnabled: true,
        platformFeeMode: "FLAT_EVENT",
        platformSetupFeeCollected: true,
        hasCompletedPaidCheckout: false,
      }),
    ).toBe(true);
  });

  it("requires a completed checkout in CONVENIENCE mode", () => {
    expect(
      isEventPlatformFeePaid({
        paymentEnabled: true,
        platformFeeMode: "CONVENIENCE",
        platformSetupFeeCollected: false,
        hasCompletedPaidCheckout: false,
      }),
    ).toBe(false);
    expect(
      isEventPlatformFeePaid({
        paymentEnabled: true,
        platformFeeMode: "CONVENIENCE",
        platformSetupFeeCollected: false,
        hasCompletedPaidCheckout: true,
      }),
    ).toBe(true);
  });
});
