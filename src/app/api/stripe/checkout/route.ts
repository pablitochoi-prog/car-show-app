import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getCurrentUser, writeAccessDeniedResponse } from "@/lib/auth";
import { createCheckoutSchema } from "@/lib/validation/stripe";
import { getPlatformFee, getEventSetupFee, totalPlatformFeeForCheckout } from "@/lib/platform-fee";
import type { PlatformFeeConfig } from "@/lib/platform-fee-config";
import { formatEventShowNumber } from "@/lib/event-show-number";
import { dollarsToCents } from "@/lib/money";
import { resolvePayableTier } from "@/lib/tiers";
import {
  computeAdditionalBalanceCheckout,
  computeAdditionalDonationBalanceCheckout,
  validateDonationNotDecreasedAfterPayment,
} from "@/lib/registration-payment-display";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { registrationId, donationCents: requestedDonationCents } = parsed.data;

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      tier: true,
      vehicles: { select: { id: true } },
      event: {
        select: {
          id: true,
          name: true,
          showNumber: true,
          currency: true,
          paymentEnabled: true,
          registrationFeeType: true,
          registrationFeeDollars: true,
          platformFeeMode: true,
          platformSetupFeeCollected: true,
          registrationTiers: {
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          },
          organization: {
            select: {
              id: true,
              stripeAccountId: true,
              stripeChargesEnabled: true,
            },
          },
        },
      },
    },
  });

  if (!registration) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  const isGuestRegistration = !registration.userId;

  if (isGuestRegistration) {
    if (!registration.guestEmail) {
      return NextResponse.json({ error: "Invalid guest registration" }, { status: 400 });
    }
  } else if (!user || registration.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else {
    const writeDenied = writeAccessDeniedResponse(user);
    if (writeDenied) return writeDenied;
  }

  const isAdditionalBalancePayment =
    registration.paymentStatus === "PAID";

  const event = registration.event;
  const org = event.organization;
  const eventLabel = `${formatEventShowNumber(event.showNumber)} ${event.name}`;

  if (!org?.stripeAccountId || !org.stripeChargesEnabled) {
    return NextResponse.json(
      { error: "Stripe payments are not set up for this event" },
      { status: 400 }
    );
  }

  const feeConfig = await getPlatformFee();
  const eventSetupFee = await getEventSetupFee();
  const perVehicleFeeConfig: PlatformFeeConfig =
    event.platformFeeMode === "FLAT_EVENT"
      ? { type: "NONE", amountCents: null, percent: null }
      : feeConfig;
  let flatSetupFeeCharged = false;
  const isDonationEvent = event.registrationFeeType === "DONATION";

  let lineItems: NonNullable<
    Parameters<typeof stripe.checkout.sessions.create>[0]["line_items"]
  >;
  let totalApplicationFee: number;
  let totalAmountCents: number;
  let checkoutType: "standard" | "additional_balance" = "standard";

  if (isDonationEvent) {
    if (isAdditionalBalancePayment) {
      if (requestedDonationCents == null) {
        return NextResponse.json(
          {
            error:
              "Donation amount is required to pay an additional balance.",
          },
          { status: 400 },
        );
      }

      const decreaseError = validateDonationNotDecreasedAfterPayment({
        newDonationCents: requestedDonationCents,
        amountPaidCents: registration.amountCents ?? 0,
        platformFeeCentsPaid: registration.platformFeeCents,
      });
      if (decreaseError) {
        return NextResponse.json({ error: decreaseError }, { status: 400 });
      }

      let vehicleCount = registration.vehicles.length;
      if (vehicleCount === 0 && registration.guestVehicles) {
        const gv = registration.guestVehicles as unknown[];
        vehicleCount = Array.isArray(gv) ? gv.length : 0;
      }
      if (vehicleCount === 0) vehicleCount = 1;

      const additional = computeAdditionalDonationBalanceCheckout({
        donationCents: requestedDonationCents,
        vehicleCount,
        amountPaidCents: registration.amountCents ?? 0,
        platformFeeCentsPaid: registration.platformFeeCents,
        platformFee: perVehicleFeeConfig,
        suggestedDonationPerVehicleDollars: event.registrationFeeDollars,
      });

      if (!additional) {
        return NextResponse.json(
          { error: "No balance is due for this registration." },
          { status: 400 },
        );
      }

      checkoutType = "additional_balance";
      totalApplicationFee = additional.totalApplicationFee;
      totalAmountCents = additional.amountDueCents;

      lineItems = [];

      if (additional.donationDeltaCents > 0) {
        lineItems.push({
          price_data: {
            currency: event.currency,
            unit_amount: additional.donationDeltaCents,
            product_data: {
              name: `${eventLabel} — Additional Donation`,
              description: `Additional donation for ${eventLabel}`,
            },
          },
          quantity: 1,
        });
      }

      if (
        additional.platformDeltaCents > 0 &&
        additional.perVehiclePlatformFeeCents > 0 &&
        additional.additionalPlatformFeeVehicleCount > 0
      ) {
        lineItems.push({
          price_data: {
            currency: event.currency,
            unit_amount: additional.perVehiclePlatformFeeCents,
            product_data: {
              name: "Registration fee",
              description: "Platform registration fee (additional vehicle)",
            },
          },
          quantity: additional.additionalPlatformFeeVehicleCount,
        });
      }

      if (lineItems.length === 0) {
        return NextResponse.json(
          { error: "No balance is due for this registration." },
          { status: 400 },
        );
      }
    } else {
    const donationCents = registration.amountCents ?? 0;
    if (donationCents <= 0) {
      return NextResponse.json(
        { error: "Enter a donation amount before proceeding to payment." },
        { status: 400 },
      );
    }

    let vehicleCount = registration.vehicles.length;
    if (vehicleCount === 0 && registration.guestVehicles) {
      const gv = registration.guestVehicles as unknown[];
      vehicleCount = Array.isArray(gv) ? gv.length : 0;
    }
    if (vehicleCount === 0) vehicleCount = 1;

    const suggestedPerVehicleCents =
      dollarsToCents(event.registrationFeeDollars ?? 0);
    const donationFees = totalPlatformFeeForCheckout({
      mode: event.platformFeeMode,
      platformFee: feeConfig,
      unitPriceCents: suggestedPerVehicleCents,
      vehicleCount,
      setupFeeCents: eventSetupFee.amountCents,
      setupFeeCollected: event.platformSetupFeeCollected,
    });
    totalApplicationFee = donationFees.totalApplicationFeeCents;
    totalAmountCents = donationCents + totalApplicationFee;

    lineItems = [
      {
        price_data: {
          currency: event.currency,
          unit_amount: donationCents,
          product_data: {
            name: `${eventLabel} — Donation`,
            description: `Donation for ${eventLabel}`,
          },
        },
        quantity: 1,
      },
    ];

    if (donationFees.perVehiclePlatformFeeCents > 0) {
      lineItems.push({
        price_data: {
          currency: event.currency,
          unit_amount: donationFees.perVehiclePlatformFeeCents,
          product_data: {
            name: "Registration fee",
            description: "Platform registration fee (per vehicle)",
          },
        },
        quantity: vehicleCount,
      });
    }

    if (donationFees.flatSetupFeeCents > 0) {
      flatSetupFeeCharged = true;
      lineItems.push({
        price_data: {
          currency: event.currency,
          unit_amount: donationFees.flatSetupFeeCents,
          product_data: {
            name: "Platform event setup fee",
            description: "One-time platform fee for this event",
          },
        },
        quantity: 1,
      });
    }
    }
  } else {
    const payable = resolvePayableTier(
      registration.event.registrationTiers,
      registration.tierId,
    );
    if (!payable) {
      return NextResponse.json(
        { error: "No registration tier is currently available for payment." },
        { status: 400 },
      );
    }

    const { tier: payableTier, tierChanged } = payable;
    if (tierChanged && !isAdditionalBalancePayment) {
      await prisma.registration.update({
        where: { id: registration.id },
        data: { tierId: payableTier.id },
      });
    }

    const priceCents = payableTier.priceCents;
    if (priceCents <= 0) {
      return NextResponse.json(
        { error: "This is a free tier — no payment needed" },
        { status: 400 },
      );
    }

    let vehicleCount = registration.vehicles.length;
    if (vehicleCount === 0 && registration.guestVehicles) {
      const gv = registration.guestVehicles as unknown[];
      vehicleCount = Array.isArray(gv) ? gv.length : 0;
    }
    if (vehicleCount === 0) vehicleCount = 1;

    if (isAdditionalBalancePayment) {
      const additional = computeAdditionalBalanceCheckout({
        unitPriceCents: priceCents,
        vehicleCount,
        amountPaidCents: registration.amountCents ?? 0,
        platformFee: perVehicleFeeConfig,
      });
      if (!additional) {
        return NextResponse.json(
          { error: "No balance is due for this registration." },
          { status: 400 },
        );
      }

      checkoutType = "additional_balance";
      const {
        additionalVehicleCount,
        tierPriceCents,
        perVehiclePlatformFeeCents,
        amountDueCents,
      } = additional;
      totalApplicationFee = additional.totalApplicationFee;
      totalAmountCents = amountDueCents;

      lineItems = [
        {
          price_data: {
            currency: event.currency,
            unit_amount: tierPriceCents,
            product_data: {
              name: `${eventLabel} — ${payableTier.name} (additional vehicle)`,
              description: `Additional registration for ${eventLabel}`,
            },
          },
          quantity: additionalVehicleCount,
        },
      ];

      if (perVehiclePlatformFeeCents > 0) {
        lineItems.push({
          price_data: {
            currency: event.currency,
            unit_amount: perVehiclePlatformFeeCents,
            product_data: {
              name: "Convenience Fee",
              description: "Platform convenience fee (additional vehicle)",
            },
          },
          quantity: additionalVehicleCount,
        });
      }
    } else {
      const checkoutFees = totalPlatformFeeForCheckout({
        mode: event.platformFeeMode,
        platformFee: feeConfig,
        unitPriceCents: priceCents,
        vehicleCount,
        setupFeeCents: eventSetupFee.amountCents,
        setupFeeCollected: event.platformSetupFeeCollected,
      });
      totalApplicationFee = checkoutFees.totalApplicationFeeCents;
      totalAmountCents = priceCents * vehicleCount + totalApplicationFee;

      lineItems = [
        {
          price_data: {
            currency: event.currency,
            unit_amount: priceCents,
            product_data: {
              name: `${eventLabel} — ${payableTier.name}`,
              description: `Registration for ${eventLabel}`,
            },
          },
          quantity: vehicleCount,
        },
      ];

      if (checkoutFees.perVehiclePlatformFeeCents > 0) {
        lineItems.push({
          price_data: {
            currency: event.currency,
            unit_amount: checkoutFees.perVehiclePlatformFeeCents,
            product_data: {
              name: "Convenience Fee",
              description: "Platform convenience fee per vehicle",
            },
          },
          quantity: vehicleCount,
        });
      }

      if (checkoutFees.flatSetupFeeCents > 0) {
        flatSetupFeeCharged = true;
        lineItems.push({
          price_data: {
            currency: event.currency,
            unit_amount: checkoutFees.flatSetupFeeCents,
            product_data: {
              name: "Platform event setup fee",
              description: "One-time platform fee for this event",
            },
          },
          quantity: 1,
        });
      }
    }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      payment_intent_data: {
        application_fee_amount:
          totalApplicationFee > 0 ? totalApplicationFee : undefined,
        transfer_data: {
          destination: org.stripeAccountId,
        },
        metadata: {
          eventId: event.id,
          registrationId: registration.id,
          organizerId: org.id,
          connectedAccountId: org.stripeAccountId,
          checkoutType,
          ...(flatSetupFeeCharged ? { flatSetupFeeCharged: "true" } : {}),
          ...(user ? { registrantUserId: user.id } : {}),
        },
      },
      metadata: {
        eventId: event.id,
        registrationId: registration.id,
        checkoutType,
        ...(flatSetupFeeCharged ? { flatSetupFeeCharged: "true" } : {}),
        ...(checkoutType === "additional_balance"
          ? { additionalPlatformFeeCents: String(totalApplicationFee) }
          : {}),
        ...(user ? { registrantUserId: user.id } : {}),
      },
      success_url: `${appUrl()}/events/${event.id}/register/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/events/${event.id}/register/checkout-canceled?registration_id=${registration.id}`,
      customer_email: isGuestRegistration ? registration.guestEmail! : user!.email,
    });

    if (checkoutType === "additional_balance") {
      await prisma.registration.update({
        where: { id: registration.id },
        data: { stripeCheckoutSessionId: session.id },
      });
    } else {
      await prisma.registration.update({
        where: { id: registration.id },
        data: {
          stripeCheckoutSessionId: session.id,
          amountCents: totalAmountCents,
          platformFeeCents:
            totalApplicationFee > 0 ? totalApplicationFee : null,
          paymentStatus: "PENDING",
        },
      });
    }

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error("[POST /api/stripe/checkout]", err);
    return NextResponse.json(
      { error: "Failed to create checkout session. Please try again." },
      { status: 500 }
    );
  }
}
