import { describe, expect, it } from "vitest";
import {
  computeAdditionalBalanceCheckout,
  computeAdditionalDonationBalanceCheckout,
  derivePaidVehicleCount,
  getRegistrationAmounts,
  getRegistrationDisplayStatus,
  validateDonationNotDecreasedAfterPayment,
} from "./registration-payment-display";

const noFee = { type: "NONE" as const, amountCents: null, percent: null };

describe("getRegistrationDisplayStatus", () => {
  it("shows green for paid registrations", () => {
    expect(
      getRegistrationDisplayStatus({
        registrationStatus: "CONFIRMED",
        paymentStatus: "PAID",
        amountDueCents: 0,
      }),
    ).toEqual({ label: "Confirmed / Paid", variant: "success" });
  });

  it("shows yellow for saved unpaid registration", () => {
    expect(
      getRegistrationDisplayStatus({
        registrationStatus: "PENDING",
        paymentStatus: null,
        amountDueCents: 2000,
      }),
    ).toEqual({ label: "Registration submitted", variant: "warning" });
  });

  it("shows red when payment is in progress or failed", () => {
    expect(
      getRegistrationDisplayStatus({
        registrationStatus: "PENDING",
        paymentStatus: "PENDING",
        amountDueCents: 2000,
      }),
    ).toEqual({ label: "Pending", variant: "danger" });
  });
});

describe("getRegistrationAmounts", () => {
  it("returns paid total and zero due when paid in full", () => {
    expect(
      getRegistrationAmounts({
        registrationFeeType: "PAID",
        unitPriceCents: 2000,
        vehicleCount: 1,
        registrationStatus: "CONFIRMED",
        paymentStatus: "PAID",
        amountCents: 2050,
        platformFeeCents: 50,
        platformFee: noFee,
      }),
    ).toEqual({ amountPaidCents: 2050, amountDueCents: 0 });
  });

  it("reduces amount paid after a partial refund", () => {
    expect(
      getRegistrationAmounts({
        registrationFeeType: "PAID",
        unitPriceCents: 2000,
        vehicleCount: 1,
        registrationStatus: "CONFIRMED",
        paymentStatus: "PAID",
        amountCents: 2050,
        platformFeeCents: 50,
        refundedCents: 500,
        platformFee: noFee,
      }),
    ).toEqual({ amountPaidCents: 1550, amountDueCents: 450 });
  });

  it("derives paid vehicle count from amount paid", () => {
    expect(
      derivePaidVehicleCount({
        amountPaidCents: 2050,
        unitPriceCents: 2000,
        platformFee: noFee,
      }),
    ).toBe(1);
  });

  it("builds incremental checkout for added vehicles", () => {
    expect(
      computeAdditionalBalanceCheckout({
        unitPriceCents: 2000,
        vehicleCount: 2,
        amountPaidCents: 2050,
        platformFee: noFee,
      }),
    ).toEqual({
      amountDueCents: 1950,
      additionalVehicleCount: 1,
      tierPriceCents: 2000,
      perVehiclePlatformFeeCents: 0,
      totalApplicationFee: 0,
    });
  });

  it("returns balance due when more vehicles are added after payment", () => {
    expect(
      getRegistrationAmounts({
        registrationFeeType: "PAID",
        unitPriceCents: 2000,
        vehicleCount: 2,
        registrationStatus: "CONFIRMED",
        paymentStatus: "PAID",
        amountCents: 2050,
        platformFeeCents: 50,
        platformFee: noFee,
      }),
    ).toEqual({ amountPaidCents: 2050, amountDueCents: 1950 });
  });

  it("treats paid donation total as donation plus fees without double-counting fees", () => {
    expect(
      getRegistrationAmounts({
        registrationFeeType: "DONATION",
        unitPriceCents: 5000,
        vehicleCount: 2,
        registrationStatus: "CONFIRMED",
        paymentStatus: "PAID",
        amountCents: 5100,
        platformFeeCents: 100,
        platformFee: { type: "FIXED", amountCents: 50, percent: null },
        suggestedDonationPerVehicleDollars: 25,
      }),
    ).toEqual({ amountPaidCents: 5100, amountDueCents: 0 });
  });

  it("computes additional donation balance when donation increases", () => {
    expect(
      computeAdditionalDonationBalanceCheckout({
        donationCents: 5500,
        vehicleCount: 3,
        amountPaidCents: 5100,
        platformFeeCentsPaid: 100,
        platformFee: { type: "FIXED", amountCents: 50, percent: null },
        suggestedDonationPerVehicleDollars: 10,
      }),
    ).toMatchObject({
      donationDeltaCents: 500,
      amountDueCents: 550,
    });
  });

  it("shows balance due when donation increases after payment", () => {
    expect(
      getRegistrationAmounts({
        registrationFeeType: "DONATION",
        unitPriceCents: 5500,
        vehicleCount: 3,
        registrationStatus: "CONFIRMED",
        paymentStatus: "PAID",
        amountCents: 5100,
        platformFeeCents: 100,
        platformFee: { type: "FIXED", amountCents: 50, percent: null },
        suggestedDonationPerVehicleDollars: 10,
      }),
    ).toEqual({ amountPaidCents: 5100, amountDueCents: 550 });
  });

  it("does not show false balance due when paid total includes platform fees", () => {
    expect(
      getRegistrationAmounts({
        registrationFeeType: "DONATION",
        unitPriceCents: 6200,
        vehicleCount: 3,
        registrationStatus: "CONFIRMED",
        paymentStatus: "PAID",
        amountCents: 6200,
        platformFeeCents: 100,
        platformFee: { type: "FIXED", amountCents: 50, percent: null },
        suggestedDonationPerVehicleDollars: 10,
      }),
    ).toEqual({ amountPaidCents: 6200, amountDueCents: 0 });
  });

  it("rejects lowering donation below amount paid", () => {
    expect(
      validateDonationNotDecreasedAfterPayment({
        newDonationCents: 4000,
        amountPaidCents: 5100,
        platformFeeCentsPaid: 100,
      }),
    ).toContain("cannot reduce");
  });

  it("returns zero paid and computed due when unpaid", () => {
    expect(
      getRegistrationAmounts({
        registrationFeeType: "PAID",
        unitPriceCents: 2000,
        vehicleCount: 1,
        registrationStatus: "PENDING",
        paymentStatus: null,
        amountCents: null,
        platformFeeCents: null,
        platformFee: noFee,
      }),
    ).toEqual({ amountPaidCents: 0, amountDueCents: 2000 });
  });
});
