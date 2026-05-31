import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { toStripeE164Phone } from "@/lib/phone-us";

export { toStripeE164Phone } from "@/lib/phone-us";

/**
 * Find or create a Stripe Customer with the latest email, name, and phone.
 * Keeps Stripe Checkout in sync when the user updates their profile phone.
 */
export async function upsertStripeCheckoutCustomer(input: {
  email: string;
  name?: string | null;
  phone?: string | null;
}): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || undefined;
  const phone = toStripeE164Phone(input.phone);

  const existing = await stripe.customers.list({ email, limit: 1 });
  const customer = existing.data[0];

  if (customer) {
    const update: Stripe.CustomerUpdateParams = {};
    if (name) update.name = name;
    if (phone) update.phone = phone;
    if (Object.keys(update).length > 0) {
      await stripe.customers.update(customer.id, update);
    }
    return customer.id;
  }

  const created = await stripe.customers.create({
    email,
    ...(name ? { name } : {}),
    ...(phone ? { phone } : {}),
  });
  return created.id;
}

/** Disable Stripe Link — Link OTP uses Stripe's saved phone, not our profile phone. */
export const STRIPE_CHECKOUT_WALLET_OPTIONS: Stripe.Checkout.SessionCreateParams["wallet_options"] =
  {
    link: { display: "never" },
  };
