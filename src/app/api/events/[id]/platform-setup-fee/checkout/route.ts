import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { getEventSetupFee, formatEventSetupFeeLabel } from "@/lib/platform-fee";
import { isPlatformStripeReady, getPlatformStripeStatus } from "@/lib/stripe-platform";
import { formatEventShowNumber } from "@/lib/event-show-number";
import {
  upsertStripeCheckoutCustomer,
  STRIPE_CHECKOUT_WALLET_OPTIONS,
} from "@/lib/stripe-checkout-customer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

type RouteParams = { params: Promise<{ id: string }> };

/** Direct Checkout on the CarShowScout.com platform account for the flat event setup fee. */
export async function POST(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const allowed = await canManageEvent(
    user.id,
    eventId,
    undefined,
    user.platformRole,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const platformStripe = await getPlatformStripeStatus();
  if (!isPlatformStripeReady(platformStripe)) {
    return NextResponse.json(
      {
        error:
          "CarShowScout.com platform payments are not configured. Contact site admin.",
      },
      { status: 503 },
    );
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      name: true,
      showNumber: true,
      currency: true,
      platformFeeMode: true,
      platformSetupFeeCollected: true,
      organization: {
        select: { stripeChargesEnabled: true },
      },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!event.organization?.stripeChargesEnabled) {
    return NextResponse.json(
      {
        error:
          "Complete Stripe setup for your organization before paying the platform fee.",
      },
      { status: 400 },
    );
  }

  if (event.platformSetupFeeCollected) {
    return NextResponse.json(
      { error: "The flat platform fee has already been paid for this event." },
      { status: 400 },
    );
  }

  if (event.platformFeeMode !== "FLAT_EVENT") {
    return NextResponse.json(
      {
        error:
          "Save flat platform fee billing in Payment Settings before paying.",
      },
      { status: 400 },
    );
  }

  const setupFee = await getEventSetupFee();
  if (setupFee.amountCents <= 0) {
    return NextResponse.json(
      { error: "Flat platform fee is not configured." },
      { status: 400 },
    );
  }

  const eventLabel = `${formatEventShowNumber(event.showNumber)} ${event.name}`;

  try {
    const customerId = await upsertStripeCheckoutCustomer({
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.name,
      phone: user.phone,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: event.currency ?? "usd",
            unit_amount: setupFee.amountCents,
            product_data: {
              name: "CarShowScout.com platform fee",
              description: `Flat platform licensing fee — ${eventLabel}`,
            },
          },
          quantity: 1,
        },
      ],
      customer: customerId,
      customer_update: {
        name: "auto",
        address: "auto",
      },
      wallet_options: STRIPE_CHECKOUT_WALLET_OPTIONS,
      metadata: {
        checkoutType: "platform_setup_fee",
        eventId: event.id,
      },
      success_url: `${appUrl()}/organizer/events/${event.id}/edit?platform_fee_paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/organizer/events/${event.id}/edit?platform_fee_canceled=1`,
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      amountLabel: formatEventSetupFeeLabel(setupFee.amountCents),
    });
  } catch (err) {
    console.error("[POST /api/events/.../platform-setup-fee/checkout]", err);
    return NextResponse.json(
      { error: "Failed to start platform fee checkout. Please try again." },
      { status: 500 },
    );
  }
}
