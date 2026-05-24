import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { syncAccountStatus } from "@/lib/stripe-connect";
import { fulfillRegistrationFromCheckoutSession } from "@/lib/stripe-fulfill-checkout";
import { fulfillPlatformSetupFeeFromCheckoutSession } from "@/lib/stripe-fulfill-platform-setup-fee";
import { isFullStripeChargeRefund } from "@/lib/stripe-refund-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

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
    console.error(`[webhook] Error handling ${event.type}:`, err);
    return NextResponse.json(
      { error: "Webhook handler error" },
      { status: 500 }
    );
  }

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
    select: { stripeEventId: true, paymentStatus: true },
  });

  if (existing?.paymentStatus === "PAID") return;

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
