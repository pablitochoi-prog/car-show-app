import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key) {
  throw new Error(
    "STRIPE_SECRET_KEY is missing. Add it to .env.local and restart the dev server."
  );
}

const globalForStripe = globalThis as unknown as {
  stripe: Stripe | undefined;
};

export const stripe =
  globalForStripe.stripe ??
  new Stripe(key, { apiVersion: "2026-04-22.dahlia" });

if (process.env.NODE_ENV === "production") {
  globalForStripe.stripe = stripe;
}
