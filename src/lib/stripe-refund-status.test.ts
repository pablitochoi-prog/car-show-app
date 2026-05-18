import { describe, expect, it } from "vitest";
import { isFullStripeChargeRefund } from "./stripe-refund-status";

describe("isFullStripeChargeRefund", () => {
  it("returns false for partial refunds", () => {
    expect(
      isFullStripeChargeRefund({ amount: 10_000, amount_refunded: 2_500 }),
    ).toBe(false);
  });

  it("returns true when refunded amount equals charge amount", () => {
    expect(
      isFullStripeChargeRefund({ amount: 10_000, amount_refunded: 10_000 }),
    ).toBe(true);
  });
});
