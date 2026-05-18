import { describe, expect, it } from "vitest";
import {
  isStripeCheckoutAvailable,
  isStripeConnectReady,
} from "./stripe-checkout";

describe("isStripeConnectReady", () => {
  it("is true when Stripe account can charge", () => {
    expect(
      isStripeConnectReady({
        organization: {
          stripeAccountId: "acct_123",
          stripeChargesEnabled: true,
        },
      }),
    ).toBe(true);
  });

  it("is false without account or charges", () => {
    expect(isStripeConnectReady({ organization: null })).toBe(false);
    expect(
      isStripeConnectReady({
        organization: {
          stripeAccountId: "acct_123",
          stripeChargesEnabled: false,
        },
      }),
    ).toBe(false);
  });
});

describe("isStripeCheckoutAvailable", () => {
  it("requires paymentEnabled and Stripe Connect", () => {
    const org = {
      stripeAccountId: "acct_123",
      stripeChargesEnabled: true,
    };
    expect(
      isStripeCheckoutAvailable({ paymentEnabled: false, organization: org }),
    ).toBe(false);
    expect(
      isStripeCheckoutAvailable({ paymentEnabled: true, organization: org }),
    ).toBe(true);
  });
});
