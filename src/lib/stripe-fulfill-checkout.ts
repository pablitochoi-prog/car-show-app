import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { donationPlatformFeeTotalCents } from "@/lib/donation";
import { getPlatformFee } from "@/lib/platform-fee";
import { calculateApplicationFee } from "@/lib/platform-fee-config";

export type FulfillCheckoutResult = {
  registrationId: string;
  paid: boolean;
  checkoutType: "standard" | "additional_balance";
};

/**
 * Mark a registration paid from a completed Stripe Checkout session.
 * Used on the success page (local dev without webhooks) and from the webhook.
 */
export async function fulfillRegistrationFromCheckoutSession(
  sessionId: string,
  options?: { stripeEventId?: string },
): Promise<FulfillCheckoutResult | null> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const registrationId = session.metadata?.registrationId;
  if (!registrationId) return null;

  const checkoutType =
    session.metadata?.checkoutType === "additional_balance"
      ? "additional_balance"
      : "standard";

  if (session.payment_status !== "paid") {
    return { registrationId, paid: false, checkoutType };
  }

  const existing = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      paymentStatus: true,
      amountCents: true,
      platformFeeCents: true,
      stripeEventId: true,
      guestVehicles: true,
      vehicles: { select: { id: true } },
      event: {
        select: {
          registrationFeeType: true,
          registrationFeeDollars: true,
        },
      },
    },
  });

  if (!existing) return null;

  if (options?.stripeEventId && existing.stripeEventId === options.stripeEventId) {
    return {
      registrationId,
      paid: existing.paymentStatus === "PAID",
      checkoutType,
    };
  }

  const paidCents = session.amount_total ?? 0;
  const paymentIntentId = resolvePaymentIntentId(session.payment_intent);

  if (checkoutType === "additional_balance") {
    if (existing.paymentStatus !== "PAID") {
      return { registrationId, paid: false, checkoutType };
    }

    if (paidCents > 0) {
      const platformFeeCents = await resolveDonationPlatformFeeCentsAfterPayment(
        existing,
      );

      await prisma.registration.update({
        where: { id: registrationId },
        data: {
          amountCents: (existing.amountCents ?? 0) + paidCents,
          ...(platformFeeCents != null ? { platformFeeCents } : {}),
          stripeCheckoutSessionId: sessionId,
          ...(options?.stripeEventId
            ? { stripeEventId: options.stripeEventId }
            : {}),
        },
      });
    }

    return { registrationId, paid: true, checkoutType };
  }

  if (existing.paymentStatus === "PAID") {
    return { registrationId, paid: true, checkoutType };
  }

  const platformFeeCents = await resolveDonationPlatformFeeCentsAfterPayment(
    existing,
  );

  await prisma.registration.update({
    where: { id: registrationId },
    data: {
      status: "CONFIRMED",
      paymentStatus: "PAID",
      stripePaymentIntentId: paymentIntentId,
      stripeCheckoutSessionId: sessionId,
      paidAt: new Date(),
      ...(paidCents > 0 ? { amountCents: paidCents } : {}),
      ...(platformFeeCents != null ? { platformFeeCents } : {}),
      ...(options?.stripeEventId ? { stripeEventId: options.stripeEventId } : {}),
    },
  });

  return { registrationId, paid: true, checkoutType };
}

async function resolveDonationPlatformFeeCentsAfterPayment(existing: {
  event: {
    registrationFeeType: string | null;
    registrationFeeDollars: number | null;
  };
  vehicles: { id: string }[];
  guestVehicles: unknown;
  platformFeeCents: number | null;
}): Promise<number | null> {
  if (existing.event.registrationFeeType !== "DONATION") {
    return null;
  }

  let vehicleCount = existing.vehicles.length;
  if (vehicleCount === 0 && existing.guestVehicles) {
    const guestList = existing.guestVehicles as unknown[];
    vehicleCount = Array.isArray(guestList) ? guestList.length : 0;
  }
  vehicleCount = Math.max(vehicleCount, 1);

  const feeConfig = await getPlatformFee();
  const { totalCents } = donationPlatformFeeTotalCents(
    (unit) => calculateApplicationFee(feeConfig, unit),
    existing.event.registrationFeeDollars,
    vehicleCount,
  );

  return totalCents > 0 ? totalCents : null;
}

function resolvePaymentIntentId(
  paymentIntent: Stripe.Checkout.Session["payment_intent"],
): string | null {
  if (typeof paymentIntent === "string") return paymentIntent;
  if (paymentIntent && typeof paymentIntent === "object" && "id" in paymentIntent) {
    return paymentIntent.id;
  }
  return null;
}
