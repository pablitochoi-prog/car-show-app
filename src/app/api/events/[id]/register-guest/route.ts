import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guestRegisterSchema } from "@/lib/validation/registration";
import { validateGuestRegistrationVehiclesAndClasses } from "@/lib/registration-vehicle-classes";
import { isTierCurrentlyOpen } from "@/lib/tiers";
import { assignPublicIdsToGuestVehiclePayloads } from "@/lib/event-sms-vehicle-id";
import { syncAllRegistrationStaffPhotos } from "@/lib/event-registration-staff-photos";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { id: eventId } = await params;

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
    select: { id: true, status: true, registrationFeeType: true },
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

  const registration = await prisma.$transaction(async (tx) => {
    const guestVehicles = await assignPublicIdsToGuestVehiclePayloads(
      tx,
      eventId,
      vehiclePayloads,
    );

    return tx.registration.create({
      data: {
        eventId,
        tierId: tier.id,
        status,
        ...(isDonationEvent ? { amountCents: donationCents } : {}),
        guestFirstName: parsed.data.firstName.trim(),
        guestLastName: parsed.data.lastName.trim(),
        guestEmail,
        guestPhone: parsed.data.phone?.trim() || null,
        guestStreet: parsed.data.street.trim(),
        guestCity: parsed.data.city.trim(),
        guestState: parsed.data.state.trim(),
        guestZip: parsed.data.zip.trim(),
        guestVehicles,
      },
    });
  });

  try {
    await syncAllRegistrationStaffPhotos(registration.id);
  } catch (e) {
    console.error("POST register-guest staff photo snapshot:", e);
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
