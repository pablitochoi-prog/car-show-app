import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { syncAccountStatus } from "@/lib/stripe-connect";
import { fulfillRegistrationFromCheckoutSession } from "@/lib/stripe-fulfill-checkout";
import { fulfillPlatformSetupFeeFromCheckoutSession } from "@/lib/stripe-fulfill-platform-setup-fee";
import { notifyRegistrationConfirmationEmail } from "@/lib/email/notify-registration-confirmation-email";
import { isFullStripeChargeRefund } from "@/lib/stripe-refund-status";
import { captureObservabilityException } from "@/lib/sentry-observability";
import { logObservabilityError } from "@/lib/structured-logging";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

/** Refunded/cancelled registrations must not be revived by a replayed success. */
function isTerminalRegistrationState(
  registration:
    | { paymentStatus?: string | null; status?: string | null }
    | null
    | undefined,
): boolean {
  if (!registration) return false;
  return (
    registration.paymentStatus === "REFUNDED" ||
    registration.paymentStatus === "CANCELED" ||
    registration.status === "CANCELLED"
  );
}

export async function POST(request: Request) {
  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const headerList = await headers();
  const signature = headerList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  // Idempotency: ignore any event id we have already fully processed. This
  // protects every handler from Stripe redeliveries, including a success event
  // replayed after a refund (which a per-registration marker would not catch).
  const alreadyProcessed = await prisma.processedStripeEvent.findUnique({
    where: { id: event.id },
    select: { id: true },
  });
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event);
        break;
      case "checkout.session.expired":
        await handleCheckoutExpired(event);
        break;
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailed(event);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event);
        break;
      case "account.updated":
        await handleAccountUpdated(event);
        break;
      default:
        break;
    }
  } catch (err) {
    logObservabilityError({
      source: "stripe_webhook",
      error: err,
      meta: { eventType: event.type },
    });
    captureObservabilityException(err, {
      source: "stripe_webhook",
      eventType: event.type,
    });
    return NextResponse.json(
      { error: "Webhook handler error" },
      { status: 500 }
    );
  }

  // Record only after successful handling so a failed handler is retried by
  // Stripe rather than being silently skipped. A unique-constraint race on
  // concurrent redelivery is benign (handlers are already idempotent).
  await prisma.processedStripeEvent
    .create({ data: { id: event.id, type: event.type } })
    .catch(() => undefined);

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  if (!session.id) return;

  if (session.metadata?.checkoutType === "platform_setup_fee") {
    await fulfillPlatformSetupFeeFromCheckoutSession(session.id);
    return;
  }

  await fulfillRegistrationFromCheckoutSession(session.id, {
    stripeEventId: event.id,
  });
}

async function handleCheckoutExpired(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const registrationId = session.metadata?.registrationId;
  if (!registrationId) return;

  const existing = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { stripeEventId: true, paymentStatus: true },
  });

  if (existing?.stripeEventId === event.id) return;
  if (existing?.paymentStatus === "PAID") return;

  await prisma.registration.update({
    where: { id: registrationId },
    data: {
      paymentStatus: "CANCELED",
      stripeEventId: event.id,
    },
  });
}

async function handlePaymentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const registrationId = paymentIntent.metadata?.registrationId;
  if (!registrationId) return;

  const existing = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { stripeEventId: true, paymentStatus: true, status: true },
  });

  if (existing?.paymentStatus === "PAID") return;
  // Never resurrect a refunded/cancelled registration from a replayed success.
  if (isTerminalRegistrationState(existing)) return;

  await prisma.registration.update({
    where: { id: registrationId },
    data: {
      status: "CONFIRMED",
      paymentStatus: "PAID",
      stripePaymentIntentId: paymentIntent.id,
      paidAt: new Date(),
      stripeEventId: event.id,
    },
  });

  await notifyRegistrationConfirmationEmail(registrationId);
}

async function handlePaymentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const registrationId = paymentIntent.metadata?.registrationId;
  if (!registrationId) return;

  const existing = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { stripeEventId: true, paymentStatus: true },
  });

  if (existing?.paymentStatus === "PAID") return;

  await prisma.registration.update({
    where: { id: registrationId },
    data: {
      paymentStatus: "FAILED",
      stripeEventId: event.id,
    },
  });
}

async function handleChargeRefunded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;
  const pi =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : null;
  if (!pi) return;

  const registration = await prisma.registration.findUnique({
    where: { stripePaymentIntentId: pi },
    select: {
      id: true,
      stripeEventId: true,
      status: true,
      paymentStatus: true,
    },
  });

  if (!registration) return;
  if (registration.stripeEventId === event.id) return;

  const fullRefund = isFullStripeChargeRefund(charge);

  await prisma.registration.update({
    where: { id: registration.id },
    data: {
      refundedCents: charge.amount_refunded,
      ...(fullRefund
        ? { paymentStatus: "REFUNDED" as const, status: "CANCELLED" as const }
        : {}),
      stripeEventId: event.id,
    },
  });
}

async function handleAccountUpdated(event: Stripe.Event) {
  const account = event.data.object as Stripe.Account;
  if (!account.id) return;

  const org = await prisma.organization.findUnique({
    where: { stripeAccountId: account.id },
    select: { id: true },
  });

  if (!org) return;

  await syncAccountStatus(account.id);
}
