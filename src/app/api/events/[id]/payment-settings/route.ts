import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { eventPaymentSettingsSchema } from "@/lib/validation/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const allowed = await canManageEvent(
    user.id,
    eventId,
    undefined,
    user.platformRole
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = eventPaymentSettingsSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { paymentEnabled } = parsed.data;

  if (paymentEnabled) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        orgId: true,
        organization: {
          select: { stripeChargesEnabled: true },
        },
      },
    });

    if (!event?.orgId || !event.organization?.stripeChargesEnabled) {
      return NextResponse.json(
        {
          error:
            "Cannot enable payments. The linked organization must complete Stripe setup first.",
        },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: { paymentEnabled },
    select: { id: true, paymentEnabled: true },
  });

  return NextResponse.json(updated);
}
