/** Human-readable copy for Stripe Connect `requirements.disabled_reason`. */
export function describeStripeDisabledReason(reason: string | null | undefined): {
  title: string;
  detail: string;
  /** User can fix via Finish Stripe Setup (account link). */
  recoverableViaLink: boolean;
  /** User should disconnect and connect a new Stripe account. */
  suggestDisconnectReconnect: boolean;
} {
  if (!reason) {
    return {
      title: "Setup incomplete",
      detail: "Complete every step in Stripe, then return to CarShowScout.",
      recoverableViaLink: true,
      suggestDisconnectReconnect: false,
    };
  }

  if (reason === "requirements.past_due") {
    return {
      title: "Verification overdue",
      detail:
        "Stripe still needs updated verification information before payments can be enabled.",
      recoverableViaLink: true,
      suggestDisconnectReconnect: false,
    };
  }

  if (
    reason === "requirements.pending_verification" ||
    reason === "under_review"
  ) {
    return {
      title: "Under review",
      detail:
        "Stripe is reviewing your submission. Refresh status in a few minutes.",
      recoverableViaLink: false,
      suggestDisconnectReconnect: false,
    };
  }

  if (reason.startsWith("rejected.")) {
    return {
      title: "Account not approved",
      detail:
        "Stripe could not approve this connected account. Disconnect below, then connect again with corrected business details—or contact Stripe support.",
      recoverableViaLink: false,
      suggestDisconnectReconnect: true,
    };
  }

  return {
    title: "Account restricted",
    detail: `Stripe reported: ${reason.replace(/_/g, " ")}. Try Finish Stripe Setup, or disconnect and connect again.`,
    recoverableViaLink: true,
    suggestDisconnectReconnect: reason.includes("rejected"),
  };
}
