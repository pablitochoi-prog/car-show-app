import { stripe } from "@/lib/stripe";

export type PlatformStripeStatus = {
  configured: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  accountId: string | null;
  businessName: string | null;
  error: string | null;
};

/**
 * CarShowScout.com platform Stripe account used to collect convenience fees
 * (via Connect application fees) and direct flat platform fee payments.
 */
export async function getPlatformStripeStatus(): Promise<PlatformStripeStatus> {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return {
      configured: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      accountId: null,
      businessName: null,
      error: "STRIPE_SECRET_KEY is not configured.",
    };
  }

  try {
    const account = await stripe.accounts.retrieve();
    return {
      configured: true,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      accountId: account.id,
      businessName:
        account.business_profile?.name ??
        account.settings?.dashboard?.display_name ??
        null,
      error: null,
    };
  } catch (err) {
    return {
      configured: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      accountId: null,
      businessName: null,
      error:
        err instanceof Error
          ? err.message
          : "Unable to reach the Stripe platform account.",
    };
  }
}

export function isPlatformStripeReady(status: PlatformStripeStatus): boolean {
  return status.configured && status.chargesEnabled;
}
