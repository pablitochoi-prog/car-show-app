import { describe, expect, it } from "vitest";
import { buildStripeConnectSyncResult } from "@/lib/stripe-connect-sync";

function mockAccount(overrides: Record<string, unknown>) {
  return {
    charges_enabled: false,
    payouts_enabled: false,
    details_submitted: true,
    requirements: {
      currently_due: [] as string[],
      past_due: [] as string[],
      disabled_reason: null as string | null,
      errors: [] as Array<{ code: string; reason: string; requirement: string }>,
    },
    ...overrides,
  };
}

describe("buildStripeConnectSyncResult", () => {
  it("maps requirements.past_due to RESTRICTED not DISABLED", () => {
    const sync = buildStripeConnectSyncResult(
      mockAccount({
        requirements: {
          currently_due: ["individual.verification.document"],
          past_due: ["individual.verification.document"],
          disabled_reason: "requirements.past_due",
          errors: [],
        },
      }),
    );
    expect(sync.stripeAccountStatus).toBe("RESTRICTED");
    expect(sync.disabledReason).toBe("requirements.past_due");
  });

  it("maps pending_verification to pendingReview", () => {
    const sync = buildStripeConnectSyncResult(
      mockAccount({
        requirements: {
          currently_due: [],
          past_due: [],
          disabled_reason: "requirements.pending_verification",
          errors: [],
        },
      }),
    );
    expect(sync.stripeAccountStatus).toBe("ONBOARDING");
    expect(sync.pendingReview).toBe(true);
  });

  it("maps rejected to DISABLED", () => {
    const sync = buildStripeConnectSyncResult(
      mockAccount({
        requirements: {
          currently_due: [],
          past_due: [],
          disabled_reason: "rejected.fraud",
          errors: [],
        },
      }),
    );
    expect(sync.stripeAccountStatus).toBe("DISABLED");
  });
});
