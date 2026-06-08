import { describe, expect, it, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  sessionRetrieve: vi.fn(),
  registrationFindUnique: vi.fn(),
  registrationUpdate: vi.fn(),
  eventUpdate: vi.fn(),
  notifyEmail: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: { checkout: { sessions: { retrieve: h.sessionRetrieve } } },
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    registration: {
      findUnique: h.registrationFindUnique,
      update: h.registrationUpdate,
    },
    event: { update: h.eventUpdate },
  },
}));
vi.mock("@/lib/email/notify-registration-confirmation-email", () => ({
  notifyRegistrationConfirmationEmail: h.notifyEmail,
}));

import { fulfillRegistrationFromCheckoutSession } from "@/lib/stripe-fulfill-checkout";

function paidSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "sess_1",
    payment_status: "paid",
    amount_total: 5000,
    payment_intent: "pi_1",
    metadata: { registrationId: "reg_1" },
    ...overrides,
  };
}

function refundedRegistration(overrides: Record<string, unknown> = {}) {
  return {
    id: "reg_1",
    status: "CANCELLED",
    paymentStatus: "REFUNDED",
    amountCents: 5000,
    platformFeeCents: 0,
    stripeEventId: "evt_refund",
    guestVehicles: null,
    vehicles: [],
    event: {
      id: "event_1",
      registrationFeeType: "PAID",
      registrationFeeDollars: 50,
      platformFeeMode: "PASS_TO_REGISTRANT",
      platformSetupFeeCollected: true,
    },
    ...overrides,
  };
}

describe("fulfillRegistrationFromCheckoutSession refund replay protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.registrationUpdate.mockResolvedValue({});
    h.notifyEmail.mockResolvedValue(undefined);
  });

  it("does not revive a REFUNDED/CANCELLED registration on a late success", async () => {
    h.sessionRetrieve.mockResolvedValue(paidSession());
    h.registrationFindUnique.mockResolvedValue(refundedRegistration());

    const result = await fulfillRegistrationFromCheckoutSession("sess_1", {
      stripeEventId: "evt_new",
    });

    expect(result).toEqual({
      registrationId: "reg_1",
      paid: false,
      checkoutType: "standard",
    });
    expect(h.registrationUpdate).not.toHaveBeenCalled();
    expect(h.notifyEmail).not.toHaveBeenCalled();
  });

  it("marks a pending registration paid on first fulfillment", async () => {
    h.sessionRetrieve.mockResolvedValue(paidSession());
    h.registrationFindUnique.mockResolvedValue(
      refundedRegistration({ status: "PENDING", paymentStatus: "PENDING" }),
    );

    const result = await fulfillRegistrationFromCheckoutSession("sess_1", {
      stripeEventId: "evt_new",
    });

    expect(result).toEqual({
      registrationId: "reg_1",
      paid: true,
      checkoutType: "standard",
    });
    expect(h.registrationUpdate).toHaveBeenCalledTimes(1);
  });
});
