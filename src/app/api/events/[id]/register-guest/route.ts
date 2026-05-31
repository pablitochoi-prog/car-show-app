import { NextResponse } from "next/server";
import { prisma, runInteractiveTransaction } from "@/lib/db";
import { guestRegisterSchema } from "@/lib/validation/registration";
import { validateGuestRegistrationVehiclesAndClasses } from "@/lib/registration-vehicle-classes";
import { isTierCurrentlyOpen } from "@/lib/tiers";
import { assignPublicIdsToGuestVehiclePayloads } from "@/lib/event-sms-vehicle-id";
import {
  isRegistrationPostSubmitBackgroundEnabled,
  runRegistrationPostSubmitSideEffects,
  scheduleRegistrationPostSubmitSideEffects,
} from "@/lib/registration-post-submit";
import { syncVehicleSaleListingsForGuestVehicles } from "@/lib/sync-vehicle-sale-listings";
import {
  buildSmsNotificationsConsentFields,
  resolveRequestClientMetadata,
  SMS_NOTIFICATIONS_OPT_IN_SOURCES,
} from "@/lib/sms-notifications-consent";
import { withPerfTimingResponse } from "@/lib/perf-timing";
import {
  checkGuestRegistrationRateLimit,
  logRateLimitBlock,
  rateLimitJsonResponse,
} from "@/lib/rate-limit";

type RouteParams = { params: Promise<{ id: string }> };

function resolveRegistrationSaveError(err: unknown): string {
  if (err instanceof Error) {
    if (
      err.message.includes("Unable to start a transaction") ||
      err.message.includes("Transaction API error")
    ) {
      return "Registration is busy right now. Please try again in a moment.";
    }
    return err.message;
  }
  return "Registration could not be saved.";
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id: eventId } = await params;
  return withPerfTimingResponse(
    "api.events.register-guest",
    { eventId },
    async () => postRegisterGuest(request, eventId),
  );
}

async function postRegisterGuest(request: Request, eventId: string) {
  const guestRateLimit = checkGuestRegistrationRateLimit({ eventId, request });
  if (!guestRateLimit.ok) {
    logRateLimitBlock({
      route: "api.events.register-guest",
      scope: "guest-register",
      retryAfterSeconds: guestRateLimit.retryAfterSeconds,
    });
    return rateLimitJsonResponse(guestRateLimit);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = guestRegisterSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      status: true,
      registrationFeeType: true,
      vehicleSaleInquiriesEnabled: true,
    },
  });

  if (!event || !["PUBLISHED", "ACTIVE"].includes(event.status)) {
    return NextResponse.json(
      { error: "Registration is not open for this event" },
      { status: 400 },
    );
  }

  const tier = await prisma.registrationTier.findFirst({
    where: { id: parsed.data.tierId, eventId },
  });

  if (!tier) {
    return NextResponse.json(
      { error: "Invalid registration tier" },
      { status: 400 },
    );
  }

  if (!isTierCurrentlyOpen(tier)) {
    return NextResponse.json(
      { error: "This registration tier is not open right now" },
      { status: 400 },
    );
  }

  const eventCategoryIds = (
    await prisma.eventCategory.findMany({
      where: { eventId },
      select: { id: true },
    })
  ).map((row) => row.id);

  const classError = validateGuestRegistrationVehiclesAndClasses({
    allowedCategoryIds: eventCategoryIds,
    vehicles: parsed.data.vehicles,
  });
  if (classError) {
    return NextResponse.json({ error: classError }, { status: 400 });
  }

  const guestEmail = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.registration.findFirst({
    where: { eventId, guestEmail },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A guest with this email is already registered for this event" },
      { status: 400 },
    );
  }

  const isDonationEvent = event.registrationFeeType === "DONATION";
  const donationCents = isDonationEvent
    ? (parsed.data.donationCents ?? 0)
    : 0;
  const requiresPayment = isDonationEvent
    ? donationCents > 0
    : tier.priceCents > 0;
  const status = requiresPayment
    ? ("PENDING" as const)
    : ("CONFIRMED" as const);

  const vehiclePayloads = parsed.data.vehicles.map((v) => ({
    year: v.year,
    make: v.make.trim(),
    model: v.model.trim(),
    trim: v.trim?.trim() || null,
    nickname: v.nickname?.trim() || null,
    notes: v.notes?.trim() || null,
    photoUrl: v.photoUrl ?? null,
    eventCategoryId: v.eventCategoryId ?? null,
  }));

  let registration;
  try {
    registration = await runInteractiveTransaction(async (tx) => {
    const guestVehicles = await assignPublicIdsToGuestVehiclePayloads(
      tx,
      eventId,
      vehiclePayloads,
    );

    const reg = await tx.registration.create({
      data: {
        eventId,
        tierId: tier.id,
        status,
        ...(isDonationEvent ? { amountCents: donationCents } : {}),
        guestFirstName: parsed.data.firstName.trim(),
        guestLastName: parsed.data.lastName.trim(),
        guestEmail,
        guestPhone: parsed.data.phone?.trim() || null,
        guestStreet: parsed.data.street.trim() || null,
        guestCity: parsed.data.city.trim(),
        guestState: parsed.data.state.trim(),
        guestZip: parsed.data.zip.trim(),
        guestVehicles,
        ...buildSmsNotificationsConsentFields({
          optIn: parsed.data.smsNotificationsOptIn ?? false,
          phone: parsed.data.phone,
          source: SMS_NOTIFICATIONS_OPT_IN_SOURCES.eventRegistration,
          ...resolveRequestClientMetadata(request),
        }),
      },
    });

    const saleError = await syncVehicleSaleListingsForGuestVehicles(tx, {
      eventId,
      registrationId: reg.id,
      vehicleCount: parsed.data.vehicles.length,
      listingsByIndex: parsed.data.vehicles.map((v) => v.saleListing),
      saleFeatureEnabled: event.vehicleSaleInquiriesEnabled,
    });
    if (saleError) {
      throw new Error(saleError);
    }

    return reg;
  });
  } catch (err) {
    const message = resolveRegistrationSaveError(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const postSubmitCtx = {
    route: "api.events.register-guest",
    eventId,
    registrationId: registration.id,
  };
  if (isRegistrationPostSubmitBackgroundEnabled()) {
    scheduleRegistrationPostSubmitSideEffects(postSubmitCtx);
  } else {
    await runRegistrationPostSubmitSideEffects(postSubmitCtx);
  }

  const vehiclePublicIds = (
    Array.isArray(registration.guestVehicles)
      ? (registration.guestVehicles as { publicVehicleId?: string }[])
      : []
  )
    .map((v) => v.publicVehicleId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  let checkoutRequired = false;
  if (requiresPayment) {
    const fullEvent = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        organization: {
          select: {
            stripeAccountId: true,
            stripeChargesEnabled: true,
          },
        },
      },
    });
    const org = fullEvent?.organization;
    checkoutRequired =
      !!org?.stripeAccountId && !!org.stripeChargesEnabled;
  }

  return NextResponse.json(
    {
      id: registration.id,
      status: registration.status,
      checkoutRequired,
      vehiclePublicIds,
      message:
        status === "CONFIRMED"
          ? "Registration confirmed."
          : checkoutRequired
            ? "Registration created. Proceed to payment."
            : "Registration recorded. Payment pending.",
    },
    { status: 201 },
  );
}
