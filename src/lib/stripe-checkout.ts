type StripeOrgFields = {
  stripeAccountId?: string | null;
  stripeChargesEnabled?: boolean;
} | null;

/** True when the organizer's Stripe Connect account can accept charges. */
export function isStripeConnectReady(event: {
  organization?: StripeOrgFields;
}): boolean {
  const org = event.organization;
  return Boolean(org?.stripeAccountId) && Boolean(org?.stripeChargesEnabled);
}

/** True when paid registration is enabled and Stripe Connect is ready. */
export function isStripeCheckoutAvailable(event: {
  paymentEnabled: boolean;
  organization?: StripeOrgFields;
}): boolean {
  return event.paymentEnabled && isStripeConnectReady(event);
}
