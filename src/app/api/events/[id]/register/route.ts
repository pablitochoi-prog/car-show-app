import { NextResponse } from "next/server";
import { prisma, runInteractiveTransaction } from "@/lib/db";
import { getCurrentUser, writeAccessDeniedResponse } from "@/lib/auth";
import { registerForEventSchema } from "@/lib/validation/registration";
import { validateRegistrationVehiclesAndClasses } from "@/lib/registration-vehicle-classes";
import { isTierCurrentlyOpen } from "@/lib/tiers";
import { isEventAssetsPublicUrl } from "@/lib/storage/public-asset-url";
import { validateDonationNotDecreasedAfterPayment } from "@/lib/registration-payment-display";
import {
  replaceAllRegistrationVehiclesWithPublicIds,
  syncRegistrationVehiclesWithPublicIds,
} from "@/lib/event-sms-vehicle-id";
import { applyVehicleNicknamesFromRegistration } from "@/lib/registration-vehicle-nicknames";
import { applyVehicleVinsFromRegistration } from "@/lib/registration-vehicle-vins";
import {
  isRegistrationPostSubmitBackgroundEnabled,
  runRegistrationPostSubmitSideEffects,
  scheduleRegistrationPostSubmitSideEffects,
} from "@/lib/registration-post-submit";
import { syncVehicleSaleListingsForLoggedInVehicles } from "@/lib/sync-vehicle-sale-listings";
import {
  buildSmsNotificationsConsentFields,
  buildUserSmsNotificationsConsentUpdate,
  resolveRequestClientMetadata,
  SMS_NOTIFICATIONS_OPT_IN_SOURCES,
  userHasActiveSmsNotificationsOptIn,
} from "@/lib/sms-notifications-consent";
import { withPerfTimingResponse } from "@/lib/perf-timing";
import {
  checkMemberRegistrationRateLimit,
  logRateLimitBlock,
  rateLimitJsonResponse,
} from "@/lib/rate-limit";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { id: eventId } = await params;
  return withPerfTimingResponse(
    "api.events.register",
    { eventId },
    async () => postRegister(request, eventId),
  );
}

async function postRegister(request: Request, eventId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const writeDenied = writeAccessDeniedResponse(user);
  if (writeDenied) return writeDenied;

  const memberRateLimit = checkMemberRegistrationRateLimit({
    eventId,
    userId: user.id,
    request,
  });
  if (!memberRateLimit.ok) {
    logRateLimitBlock({
      route: "api.events.register",
      scope: "member-register",
      retryAfterSeconds: memberRateLimit.retryAfterSeconds,
    });
    return rateLimitJsonResponse(memberRateLimit);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = registerForEventSchema.safeParse(body);
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

  const openStatuses = ["PUBLISHED", "ACTIVE"];
  if (!event || !openStatuses.includes(event.status)) {
    return NextResponse.json(
      { error: "Registration is not open for this event" },
      { status: 400 }
    );
  }

  const existingReg = await prisma.registration.findUnique({
    where: {
      eventId_userId: { eventId, userId: user.id },
    },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      tierId: true,
      amountCents: true,
      platformFeeCents: true,
    },
  });

  const tier = await prisma.registrationTier.findFirst({
    where: { id: parsed.data.tierId, eventId },
  });

  if (!tier) {
    return NextResponse.json({ error: "Invalid registration tier" }, { status: 400 });
  }

  const isUnpaidExisting =
    !!existingReg &&
    existingReg.status !== "CANCELLED" &&
    existingReg.paymentStatus !== "PAID";
  const savingUnchangedClosedTier =
    isUnpaidExisting &&
    existingReg.tierId === parsed.data.tierId &&
    !isTierCurrentlyOpen(tier);

  if (!isTierCurrentlyOpen(tier) && !savingUnchangedClosedTier) {
    return NextResponse.json(
      { error: "This registration tier is not open right now" },
      { status: 400 }
    );
  }

  const vehicleIds = [...parsed.data.vehicleIds];
  const newVehicles = parsed.data.newVehicles ?? [];
  const vehicleCategories = parsed.data.vehicleCategories ?? {};

  for (const nv of newVehicles) {
    if (nv.photoUrl && !isEventAssetsPublicUrl(nv.photoUrl)) {
      return NextResponse.json(
        { error: "Vehicle photo must be uploaded through this app." },
        { status: 400 }
      );
    }
  }

  const owned = await prisma.vehicle.findMany({
    where: {
      id: { in: vehicleIds },
      userId: user.id,
    },
    select: { id: true },
  });

  if (owned.length !== vehicleIds.length) {
    return NextResponse.json(
      { error: "One or more vehicles are invalid or not yours" },
      { status: 400 }
    );
  }

  const uniqueIds = new Set(vehicleIds);
  if (uniqueIds.size !== vehicleIds.length) {
    return NextResponse.json(
      { error: "Duplicate vehicles selected" },
      { status: 400 }
    );
  }

  const eventCategoryIds = (
    await prisma.eventCategory.findMany({
      where: { eventId },
      select: { id: true },
    })
  ).map((row) => row.id);

  if (eventCategoryIds.length > 0 && newVehicles.length > 0) {
    return NextResponse.json(
      {
        error:
          "Add new vehicles to your garage and assign a class before registering for this event.",
      },
      { status: 400 },
    );
  }

  const classError = validateRegistrationVehiclesAndClasses({
    allowedCategoryIds: eventCategoryIds,
    vehicleIds,
    vehicleCategories,
  });
  if (classError) {
    return NextResponse.json({ error: classError }, { status: 400 });
  }

  const isDonationEvent = event.registrationFeeType === "DONATION";
  const donationCents = isDonationEvent
    ? (parsed.data.donationCents ?? 0)
    : 0;

  if (
    isDonationEvent &&
    existingReg?.paymentStatus === "PAID"
  ) {
    const decreaseError = validateDonationNotDecreasedAfterPayment({
      newDonationCents: donationCents,
      amountPaidCents: existingReg.amountCents ?? 0,
      platformFeeCentsPaid: existingReg.platformFeeCents,
    });
    if (decreaseError) {
      return NextResponse.json({ error: decreaseError }, { status: 400 });
    }
  }

  const requiresPayment = isDonationEvent
    ? donationCents > 0
    : tier.priceCents > 0;
  const status = requiresPayment
    ? ("PENDING" as const)
    : ("CONFIRMED" as const);

  const contactData = {
    registrantFirstName: parsed.data.contact.firstName.trim(),
    registrantLastName: parsed.data.contact.lastName.trim(),
    registrantEmail: parsed.data.contact.email.toLowerCase().trim(),
    registrantPhone: parsed.data.contact.phone?.trim() || null,
    registrantStreet: parsed.data.contact.street.trim() || null,
    registrantCity: parsed.data.contact.city.trim(),
    registrantState: parsed.data.contact.state.trim(),
    registrantZip: parsed.data.contact.zip.trim(),
    ...buildSmsNotificationsConsentFields({
      optIn: parsed.data.smsNotificationsOptIn ?? false,
      phone: parsed.data.contact.phone,
      source: SMS_NOTIFICATIONS_OPT_IN_SOURCES.eventRegistration,
      ...resolveRequestClientMetadata(request),
    }),
  };
  const vehicleNicknames = parsed.data.vehicleNicknames;
  const vehicleVins = parsed.data.vehicleVins;
  const vehicleSaleListings = parsed.data.vehicleSaleListings;

  let registration;
  try {
    registration = await runInteractiveTransaction(async (tx) => {
    const createdVehicleIds: string[] = [];

    for (const nv of newVehicles) {
      const v = await tx.vehicle.create({
        data: {
          userId: user.id,
          year: nv.year,
          make: nv.make,
          model: nv.model,
          trim: nv.trim || null,
          nickname: nv.nickname ?? null,
          vin: nv.vin ?? null,
          photoUrl: nv.photoUrl ?? null,
          notes: nv.notes || null,
        },
      });
      createdVehicleIds.push(v.id);
    }

    const allVehicleIds = [...vehicleIds, ...createdVehicleIds];

    let reg;
    if (existingReg?.status === "CANCELLED") {
      reg = await tx.registration.update({
        where: { id: existingReg.id },
        data: {
          tierId: tier.id,
          status,
          ...contactData,
          paymentStatus: null,
          stripeCheckoutSessionId: null,
          stripePaymentIntentId: null,
          amountCents: isDonationEvent ? donationCents : null,
          platformFeeCents: null,
          paidAt: null,
          stripeEventId: null,
        },
      });
      await replaceAllRegistrationVehiclesWithPublicIds(
        tx,
        eventId,
        reg.id,
        allVehicleIds,
        vehicleCategories,
      );
      await applyVehicleNicknamesFromRegistration(
        tx,
        user.id,
        allVehicleIds,
        vehicleNicknames,
      );
      await applyVehicleVinsFromRegistration(
        tx,
        user.id,
        allVehicleIds,
        vehicleVins,
      );
    } else if (existingReg) {
      const keepPaid = existingReg.paymentStatus === "PAID";
      reg = await tx.registration.update({
        where: { id: existingReg.id },
        data: {
          tierId: tier.id,
          ...contactData,
          ...(isDonationEvent && !keepPaid
            ? { amountCents: donationCents }
            : {}),
          status: keepPaid
            ? existingReg.status
            : requiresPayment
              ? "PENDING"
              : "CONFIRMED",
        },
      });
      await syncRegistrationVehiclesWithPublicIds(
        tx,
        eventId,
        reg.id,
        allVehicleIds,
        vehicleCategories,
      );
      await applyVehicleNicknamesFromRegistration(
        tx,
        user.id,
        allVehicleIds,
        vehicleNicknames,
      );
      await applyVehicleVinsFromRegistration(
        tx,
        user.id,
        allVehicleIds,
        vehicleVins,
      );
    } else {
      reg = await tx.registration.create({
        data: {
          eventId,
          userId: user.id,
          tierId: tier.id,
          status,
          ...contactData,
          ...(isDonationEvent ? { amountCents: donationCents } : {}),
        },
      });
      await syncRegistrationVehiclesWithPublicIds(
        tx,
        eventId,
        reg.id,
        allVehicleIds,
        vehicleCategories,
      );
      await applyVehicleNicknamesFromRegistration(
        tx,
        user.id,
        allVehicleIds,
        vehicleNicknames,
      );
      await applyVehicleVinsFromRegistration(
        tx,
        user.id,
        allVehicleIds,
        vehicleVins,
      );
    }

    const saleError = await syncVehicleSaleListingsForLoggedInVehicles(tx, {
      eventId,
      registrationId: reg.id,
      sellerUserId: user.id,
      vehicleIdsInOrder: allVehicleIds,
      listingsByVehicleId: vehicleSaleListings,
      saleFeatureEnabled: event.vehicleSaleInquiriesEnabled,
    });
    if (saleError) {
      throw new Error(saleError);
    }

    return reg;
  });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message.includes("Unable to start a transaction") ||
          err.message.includes("Transaction API error")
          ? "Registration is busy right now. Please try again in a moment."
          : err.message
        : "Registration could not be saved.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (parsed.data.smsNotificationsOptIn) {
    await prisma.user.update({
      where: { id: user.id },
      data: buildUserSmsNotificationsConsentUpdate({
        optIn: true,
        phone: parsed.data.contact.phone ?? user.phone,
        source: SMS_NOTIFICATIONS_OPT_IN_SOURCES.eventRegistration,
        previouslyOptedIn: userHasActiveSmsNotificationsOptIn(user),
        ...resolveRequestClientMetadata(request),
      }),
    });
  }

  const postSubmitCtx = {
    route: "api.events.register",
    eventId,
    registrationId: registration.id,
  };
  if (isRegistrationPostSubmitBackgroundEnabled()) {
    scheduleRegistrationPostSubmitSideEffects(postSubmitCtx);
  } else {
    await runRegistrationPostSubmitSideEffects(postSubmitCtx);
  }

  const paymentComplete = registration.paymentStatus === "PAID";

  let checkoutRequired = false;
  if (requiresPayment && !paymentComplete) {
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

  const isUpdate =
    !!existingReg && existingReg.status !== "CANCELLED";

  return NextResponse.json(
    {
      id: registration.id,
      status: registration.status,
      checkoutRequired,
      updated: isUpdate,
      message:
        paymentComplete
          ? "Registration updated."
          : registration.status === "CONFIRMED"
            ? "Registration confirmed."
            : checkoutRequired
              ? "Registration saved. Proceed to payment."
              : "Registration recorded. Payment pending.",
    },
    { status: isUpdate ? 200 : 201 }
  );
}
