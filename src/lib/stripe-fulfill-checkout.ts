import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { notifyRegistrationConfirmationEmail } from "@/lib/email/notify-registration-confirmation-email";
import { donationPlatformFeeTotalCents } from "@/lib/donation";
import {
  getPlatformFee,
  getEventSetupFee,
  effectivePlatformFeeConfig,
  totalPlatformFeeForCheckout,
} from "@/lib/platform-fee";
import { calculateApplicationFee } from "@/lib/platform-fee-config";
import type { EventPlatformFeeMode } from "@/lib/event-platform-fee";
import { dollarsToCents } from "@/lib/money";

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
          id: true,
          registrationFeeType: true,
          registrationFeeDollars: true,
          platformFeeMode: true,
          platformSetupFeeCollected: true,
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

  if (session.metadata?.flatSetupFeeCharged === "true") {
    const eventId = session.metadata?.eventId;
    if (eventId) {
      await prisma.event.update({
        where: { id: eventId },
        data: { platformSetupFeeCollected: true },
      });
    }
  }

  await notifyRegistrationConfirmationEmail(registrationId);

  return { registrationId, paid: true, checkoutType };
}

async function resolveDonationPlatformFeeCentsAfterPayment(existing: {
  event: {
    id: string;
    registrationFeeType: string | null;
    registrationFeeDollars: number | null;
    platformFeeMode: EventPlatformFeeMode;
    platformSetupFeeCollected: boolean;
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

  const [feeConfig, eventSetupFee] = await Promise.all([
    getPlatformFee(),
    getEventSetupFee(),
  ]);
  const perVehicleConfig = effectivePlatformFeeConfig(
    existing.event.platformFeeMode,
    feeConfig,
  );
  const suggestedPerVehicleCents =
    dollarsToCents(existing.event.registrationFeeDollars ?? 0);

  const fees = totalPlatformFeeForCheckout({
    mode: existing.event.platformFeeMode,
    platformFee: feeConfig,
    unitPriceCents: suggestedPerVehicleCents,
    vehicleCount,
    setupFeeCents: eventSetupFee.amountCents,
    setupFeeCollected: existing.event.platformSetupFeeCollected,
  });

  const { totalCents } = donationPlatformFeeTotalCents(
    (unit) => calculateApplicationFee(perVehicleConfig, unit),
    existing.event.registrationFeeDollars,
    vehicleCount,
  );

  const platformTotal = Math.max(totalCents, fees.totalApplicationFeeCents);
  return platformTotal > 0 ? platformTotal : null;
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
