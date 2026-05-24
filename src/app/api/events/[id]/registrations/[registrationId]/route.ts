import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, writeAccessDeniedResponse } from "@/lib/auth";
import { canManageEventRegistrations } from "@/lib/organizer-registrations-auth";
import { registerForEventSchema } from "@/lib/validation/registration";
import { validateRegistrationVehiclesAndClasses } from "@/lib/registration-vehicle-classes";
import { isTierCurrentlyOpen } from "@/lib/tiers";
import { isEventAssetsPublicUrl } from "@/lib/storage/public-asset-url";
import { validateDonationNotDecreasedAfterPayment } from "@/lib/registration-payment-display";
import { syncRegistrationVehiclesWithPublicIds } from "@/lib/event-sms-vehicle-id";
import { applyVehicleNicknamesFromRegistration } from "@/lib/registration-vehicle-nicknames";
import { syncAllRegistrationStaffPhotos } from "@/lib/event-registration-staff-photos";

type RouteParams = {
  params: Promise<{ id: string; registrationId: string }>;
};

/** Organizer updates a member registration on behalf of the registrant. */
export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const writeDenied = writeAccessDeniedResponse(user);
  if (writeDenied) return writeDenied;

  const { id: eventId, registrationId } = await params;

  const allowed = await canManageEventRegistrations(
    user.id,
    eventId,
    user.platformRole,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existingReg = await prisma.registration.findFirst({
    where: { id: registrationId, eventId },
    select: {
      id: true,
      userId: true,
      status: true,
      paymentStatus: true,
      tierId: true,
      amountCents: true,
      platformFeeCents: true,
    },
  });

  if (!existingReg) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  if (!existingReg.userId) {
    return NextResponse.json(
      { error: "Guest registrations cannot be edited here yet." },
      { status: 400 },
    );
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
    select: { id: true, registrationFeeType: true },
  });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const tier = await prisma.registrationTier.findFirst({
    where: { id: parsed.data.tierId, eventId },
  });

  if (!tier) {
    return NextResponse.json({ error: "Invalid registration tier" }, { status: 400 });
  }

  const registrantUserId = existingReg.userId;

  const isUnpaidExisting =
    existingReg.status !== "CANCELLED" &&
    existingReg.paymentStatus !== "PAID";
  const savingUnchangedClosedTier =
    isUnpaidExisting &&
    existingReg.tierId === parsed.data.tierId &&
    !isTierCurrentlyOpen(tier);

  if (!isTierCurrentlyOpen(tier) && !savingUnchangedClosedTier) {
    return NextResponse.json(
      { error: "This registration tier is not open right now" },
      { status: 400 },
    );
  }

  const vehicleIds = [...parsed.data.vehicleIds];
  const newVehicles = parsed.data.newVehicles ?? [];
  const vehicleCategories = parsed.data.vehicleCategories ?? {};

  for (const nv of newVehicles) {
    if (nv.photoUrl && !isEventAssetsPublicUrl(nv.photoUrl)) {
      return NextResponse.json(
        { error: "Vehicle photo must be uploaded through this app." },
        { status: 400 },
      );
    }
  }

  const owned = await prisma.vehicle.findMany({
    where: {
      id: { in: vehicleIds },
      userId: registrantUserId,
    },
    select: { id: true },
  });

  if (owned.length !== vehicleIds.length) {
    return NextResponse.json(
      { error: "One or more vehicles are invalid for this registrant" },
      { status: 400 },
    );
  }

  const uniqueIds = new Set(vehicleIds);
  if (uniqueIds.size !== vehicleIds.length) {
    return NextResponse.json(
      { error: "Duplicate vehicles selected" },
      { status: 400 },
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
          "Add new vehicles to the registrant's garage and assign a class before saving.",
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

  if (isDonationEvent && existingReg.paymentStatus === "PAID") {
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
    registrantStreet: parsed.data.contact.street.trim(),
    registrantCity: parsed.data.contact.city.trim(),
    registrantState: parsed.data.contact.state.trim(),
    registrantZip: parsed.data.contact.zip.trim(),
  };
  const vehicleNicknames = parsed.data.vehicleNicknames;

  const registration = await prisma.$transaction(async (tx) => {
    const createdVehicleIds: string[] = [];

    for (const nv of newVehicles) {
      const v = await tx.vehicle.create({
        data: {
          userId: registrantUserId,
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

    const keepPaid = existingReg.paymentStatus === "PAID";
    const reg = await tx.registration.update({
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
            : status,
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
      registrantUserId,
      allVehicleIds,
      vehicleNicknames,
    );

    return reg;
  });

  try {
    await syncAllRegistrationStaffPhotos(registration.id);
  } catch (e) {
    console.error("PATCH registration staff photo snapshot:", e);
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

  return NextResponse.json(
    {
      id: registration.id,
      status: registration.status,
      checkoutRequired,
      updated: true,
      message: paymentComplete
        ? "Registration updated."
        : registration.status === "CONFIRMED"
          ? "Registration confirmed."
          : checkoutRequired
            ? "Registration saved. Registrant can proceed to payment."
            : "Registration updated.",
    },
    { status: 200 },
  );
}
