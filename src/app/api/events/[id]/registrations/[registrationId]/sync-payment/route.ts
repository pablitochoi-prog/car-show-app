import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canManageEventRegistrations } from "@/lib/organizer-registrations-auth";
import { fulfillRegistrationFromCheckoutSession } from "@/lib/stripe-fulfill-checkout";

type RouteParams = {
  params: Promise<{ id: string; registrationId: string }>;
};

/** Organizer syncs registration payment state from a completed Stripe Checkout session. */
export async function POST(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, registrationId } = await params;

  const allowed = await canManageEventRegistrations(
    user.id,
    eventId,
    user.platformRole,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const registration = await prisma.registration.findFirst({
    where: { id: registrationId, eventId },
    select: {
      id: true,
      paymentStatus: true,
      status: true,
      stripeCheckoutSessionId: true,
    },
  });

  if (!registration) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  if (registration.paymentStatus === "PAID") {
    return NextResponse.json({
      ok: true,
      alreadyPaid: true,
      paymentStatus: registration.paymentStatus,
      status: registration.status,
      message: "Registration is already marked paid.",
    });
  }

  const sessionId = registration.stripeCheckoutSessionId?.trim();
  if (!sessionId) {
    return NextResponse.json(
      {
        error:
          "No Stripe checkout session is stored on this registration. Generate a payment link first, or confirm the guest completed checkout.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await fulfillRegistrationFromCheckoutSession(sessionId);
    if (!result) {
      return NextResponse.json(
        { error: "Could not load the Stripe checkout session." },
        { status: 400 },
      );
    }

    const updated = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: { paymentStatus: true, status: true, paidAt: true },
    });

    return NextResponse.json({
      ok: true,
      paid: result.paid,
      paymentStatus: updated?.paymentStatus ?? null,
      status: updated?.status ?? null,
      paidAt: updated?.paidAt?.toISOString() ?? null,
      message: result.paid
        ? "Payment synced from Stripe. Registration is now marked paid."
        : "Stripe checkout is not paid yet. Ask the guest to finish payment or generate a new link.",
    });
  } catch (err) {
    console.error("[sync-payment]", err);
    return NextResponse.json(
      { error: "Could not sync payment from Stripe. Try again." },
      { status: 500 },
    );
  }
}
