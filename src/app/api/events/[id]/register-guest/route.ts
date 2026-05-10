import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guestRegisterSchema } from "@/lib/validation/registration";
import { isTierCurrentlyOpen } from "@/lib/tiers";

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
    select: { id: true, status: true },
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

  const status =
    tier.priceCents === 0 ? ("CONFIRMED" as const) : ("PENDING" as const);

  const registration = await prisma.registration.create({
    data: {
      eventId,
      tierId: tier.id,
      status,
      guestFirstName: parsed.data.firstName.trim(),
      guestLastName: parsed.data.lastName.trim(),
      guestEmail,
      guestPhone: parsed.data.phone?.trim() || null,
      guestVehicles: parsed.data.vehicles.map((v) => ({
        year: v.year,
        make: v.make.trim(),
        model: v.model.trim(),
        trim: v.trim?.trim() || null,
        notes: v.notes?.trim() || null,
      })),
    },
  });

  return NextResponse.json(
    {
      id: registration.id,
      status: registration.status,
      message:
        status === "CONFIRMED"
          ? "Registration confirmed."
          : "Registration recorded. Payment will be available in a future update.",
    },
    { status: 201 },
  );
}
