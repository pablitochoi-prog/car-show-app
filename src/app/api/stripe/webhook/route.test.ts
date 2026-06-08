import { describe, expect, it, vi, beforeEach, beforeAll } from "vitest";

const h = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  headersGet: vi.fn(),
  processedFindUnique: vi.fn(),
  processedCreate: vi.fn(),
  registrationFindUnique: vi.fn(),
  registrationUpdate: vi.fn(),
  organizationFindUnique: vi.fn(),
  fulfillRegistration: vi.fn(),
  fulfillSetupFee: vi.fn(),
  notifyEmail: vi.fn(),
  syncAccountStatus: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => ({ get: h.headersGet }),
}));
vi.mock("@/lib/stripe", () => ({
  stripe: { webhooks: { constructEvent: h.constructEvent } },
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    processedStripeEvent: {
      findUnique: h.processedFindUnique,
      create: h.processedCreate,
    },
    registration: {
      findUnique: h.registrationFindUnique,
      update: h.registrationUpdate,
    },
    organization: { findUnique: h.organizationFindUnique },
  },
}));
vi.mock("@/lib/stripe-connect", () => ({ syncAccountStatus: h.syncAccountStatus }));
vi.mock("@/lib/stripe-fulfill-checkout", () => ({
  fulfillRegistrationFromCheckoutSession: h.fulfillRegistration,
}));
vi.mock("@/lib/stripe-fulfill-platform-setup-fee", () => ({
  fulfillPlatformSetupFeeFromCheckoutSession: h.fulfillSetupFee,
}));
vi.mock("@/lib/email/notify-registration-confirmation-email", () => ({
  notifyRegistrationConfirmationEmail: h.notifyEmail,
}));
vi.mock("@/lib/sentry-observability", () => ({
  captureObservabilityException: vi.fn(),
}));
vi.mock("@/lib/structured-logging", () => ({ logObservabilityError: vi.fn() }));

let POST: (request: Request) => Promise<Response>;

function webhookRequest(): Request {
  return new Request("https://carshowscout.com/api/stripe/webhook", {
    method: "POST",
    body: "{}",
  });
}

beforeAll(async () => {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  ({ POST } = await import("./route"));
});

beforeEach(() => {
  vi.clearAllMocks();
  h.headersGet.mockImplementation((name: string) =>
    name === "stripe-signature" ? "sig_test" : null,
  );
  h.processedFindUnique.mockResolvedValue(null);
  h.processedCreate.mockResolvedValue(undefined);
  h.registrationUpdate.mockResolvedValue({});
  h.notifyEmail.mockResolvedValue(undefined);
});

describe("stripe webhook idempotency", () => {
  it("ignores a duplicate Stripe event id without re-processing", async () => {
    h.constructEvent.mockReturnValue({
      id: "evt_1",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_1", metadata: { registrationId: "reg_1" } } },
    });
    h.processedFindUnique.mockResolvedValue({ id: "evt_1" });

    const res = await POST(webhookRequest());
    const json = await res.json();

    expect(json).toMatchObject({ received: true, duplicate: true });
    expect(h.registrationFindUnique).not.toHaveBeenCalled();
    expect(h.registrationUpdate).not.toHaveBeenCalled();
    expect(h.processedCreate).not.toHaveBeenCalled();
  });

  it("does not resurrect a REFUNDED/CANCELLED registration on success redelivery", async () => {
    h.constructEvent.mockReturnValue({
      id: "evt_success_replay",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_1", metadata: { registrationId: "reg_1" } } },
    });
    // Refund already finalized this registration under a different event id.
    h.registrationFindUnique.mockResolvedValue({
      stripeEventId: "evt_refund",
      paymentStatus: "REFUNDED",
      status: "CANCELLED",
    });

    const res = await POST(webhookRequest());
    const json = await res.json();

    expect(json).toMatchObject({ received: true });
    expect(h.registrationUpdate).not.toHaveBeenCalled();
    expect(h.notifyEmail).not.toHaveBeenCalled();
    // Event still recorded so future redeliveries short-circuit immediately.
    expect(h.processedCreate).toHaveBeenCalledWith({
      data: { id: "evt_success_replay", type: "payment_intent.succeeded" },
    });
  });

  it("processes a fresh successful payment and records the event", async () => {
    h.constructEvent.mockReturnValue({
      id: "evt_fresh",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_2", metadata: { registrationId: "reg_2" } } },
    });
    h.registrationFindUnique.mockResolvedValue({
      stripeEventId: null,
      paymentStatus: "PENDING",
      status: "PENDING",
    });

    const res = await POST(webhookRequest());
    await res.json();

    expect(h.registrationUpdate).toHaveBeenCalledTimes(1);
    expect(h.notifyEmail).toHaveBeenCalledWith("reg_2");
    expect(h.processedCreate).toHaveBeenCalledWith({
      data: { id: "evt_fresh", type: "payment_intent.succeeded" },
    });
  });
});
