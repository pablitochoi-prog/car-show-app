import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { eventPaymentSettingsSchema } from "@/lib/validation/stripe";
import {
  formatFeeLabel,
  formatEventSetupFeeLabel,
  getEventSetupFee,
  getPlatformFee,
} from "@/lib/platform-fee";
import {
  isPlatformFeeModeLocked,
  platformFeeModeLockReason,
  validatePlatformFeeModeChange,
} from "@/lib/event-platform-fee-mode-lock";
import { isPlatformStripeReady, getPlatformStripeStatus } from "@/lib/stripe-platform";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
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

  const [event, platformFee, eventSetupFee, platformStripe] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      select: {
        status: true,
        platformFeeMode: true,
        platformSetupFeeCollected: true,
      },
    }),
    getPlatformFee(),
    getEventSetupFee(),
    getPlatformStripeStatus(),
  ]);

  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const modeLocked = isPlatformFeeModeLocked({
    status: event.status,
    platformSetupFeeCollected: event.platformSetupFeeCollected,
  });

  return NextResponse.json({
    platformFeeMode: event.platformFeeMode,
    platformSetupFeeCollected: event.platformSetupFeeCollected,
    platformFeeModeLocked: modeLocked,
    platformFeeModeLockReason: platformFeeModeLockReason({
      status: event.status,
      platformSetupFeeCollected: event.platformSetupFeeCollected,
    }),
    convenienceFeeLabel: formatFeeLabel(platformFee),
    flatSetupFeeLabel: formatEventSetupFeeLabel(eventSetupFee.amountCents),
    platformStripeReady: isPlatformStripeReady(platformStripe),
  });
}

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

  const { platformFeeMode } = parsed.data;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      orgId: true,
      status: true,
      platformFeeMode: true,
      platformSetupFeeCollected: true,
      organization: {
        select: { stripeChargesEnabled: true },
      },
    },
  });

  if (!event?.orgId || !event.organization?.stripeChargesEnabled) {
    return NextResponse.json(
      {
        error:
          "Complete Stripe setup for your organization before saving platform fee settings.",
      },
      { status: 400 }
    );
  }

  const lockError = validatePlatformFeeModeChange({
    status: event.status,
    platformFeeMode: event.platformFeeMode,
    platformSetupFeeCollected: event.platformSetupFeeCollected,
    nextMode: platformFeeMode,
  });
  if (lockError) {
    return NextResponse.json({ error: lockError }, { status: 400 });
  }

  if (
    platformFeeMode === "FLAT_EVENT" &&
    event.platformSetupFeeCollected &&
    event.platformFeeMode !== "FLAT_EVENT"
  ) {
    return NextResponse.json(
      {
        error:
          "The flat platform fee has already been collected. Convenience fee is the only option for new billing.",
      },
      { status: 400 }
    );
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      platformFeeMode,
      paymentEnabled: true,
    },
    select: {
      id: true,
      status: true,
      platformFeeMode: true,
      platformSetupFeeCollected: true,
      paymentEnabled: true,
    },
  });

  const modeLocked = isPlatformFeeModeLocked({
    status: updated.status,
    platformSetupFeeCollected: updated.platformSetupFeeCollected,
  });

  return NextResponse.json({
    ...updated,
    platformFeeModeLocked: modeLocked,
    platformFeeModeLockReason: platformFeeModeLockReason({
      status: updated.status,
      platformSetupFeeCollected: updated.platformSetupFeeCollected,
    }),
  });
}
