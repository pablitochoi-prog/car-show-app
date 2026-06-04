import type { StripeAccountStatus } from "@prisma/client";

export type StripeAccountRequirementsSnapshot = {
  charges_enabled?: boolean | null;
  payouts_enabled?: boolean | null;
  details_submitted?: boolean | null;
  requirements?: {
    currently_due?: string[] | null;
    past_due?: string[] | null;
    disabled_reason?: string | null;
    errors?: Array<{ code: string; reason: string; requirement: string }> | null;
  } | null;
};

export type StripeConnectSyncResult = {
  stripeAccountStatus: StripeAccountStatus;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeDetailsSubmitted: boolean;
  pendingReview: boolean;
  requirementsCurrentlyDue: string[];
  requirementsPastDue: string[];
  disabledReason: string | null;
  requirementErrors: Array<{ code: string; reason: string; requirement: string }>;
};

export function buildStripeConnectSyncResult(
  account: StripeAccountRequirementsSnapshot,
): StripeConnectSyncResult {
  const chargesEnabled = account.charges_enabled ?? false;
  const detailsSubmitted = account.details_submitted ?? false;
  const currentlyDue = account.requirements?.currently_due ?? [];
  const pastDue = account.requirements?.past_due ?? [];
  const disabledReason = account.requirements?.disabled_reason ?? null;
  const requirementErrors =
    account.requirements?.errors?.map((e) => ({
      code: e.code,
      reason: e.reason,
      requirement: e.requirement,
    })) ?? [];

  let stripeAccountStatus: StripeAccountStatus = "ONBOARDING";
  if (chargesEnabled && detailsSubmitted) {
    stripeAccountStatus = "ACTIVE";
  } else if (disabledReason?.startsWith("rejected.")) {
    stripeAccountStatus = "DISABLED";
  } else if (
    disabledReason === "requirements.past_due" ||
    currentlyDue.length > 0 ||
    pastDue.length > 0
  ) {
    stripeAccountStatus = "RESTRICTED";
  } else if (
    disabledReason === "requirements.pending_verification" ||
    disabledReason === "under_review"
  ) {
    stripeAccountStatus = "ONBOARDING";
  } else if (disabledReason) {
    stripeAccountStatus = "DISABLED";
  }

  const pendingReview =
    disabledReason === "requirements.pending_verification" ||
    disabledReason === "under_review" ||
    (detailsSubmitted &&
      !chargesEnabled &&
      stripeAccountStatus !== "DISABLED" &&
      stripeAccountStatus !== "RESTRICTED");

  return {
    stripeAccountStatus,
    stripeChargesEnabled: chargesEnabled,
    stripePayoutsEnabled: account.payouts_enabled ?? false,
    stripeDetailsSubmitted: detailsSubmitted,
    pendingReview,
    requirementsCurrentlyDue: currentlyDue,
    requirementsPastDue: pastDue,
    disabledReason,
    requirementErrors,
  };
}
