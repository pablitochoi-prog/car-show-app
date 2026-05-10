import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { registerForEventSchema } from "@/lib/validation/registration";
import { isTierCurrentlyOpen } from "@/lib/tiers";
import { isEventAssetsPublicUrl } from "@/lib/storage/public-asset-url";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

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
    select: { id: true, status: true },
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
  });

  if (existingReg) {
    return NextResponse.json(
      { error: "You are already registered for this event" },
      { status: 400 }
    );
  }

  const tier = await prisma.registrationTier.findFirst({
    where: { id: parsed.data.tierId, eventId },
  });

  if (!tier) {
    return NextResponse.json({ error: "Invalid registration tier" }, { status: 400 });
  }

  if (!isTierCurrentlyOpen(tier)) {
    return NextResponse.json(
      { error: "This registration tier is not open right now" },
      { status: 400 }
    );
  }

  const vehicleIds = [...parsed.data.vehicleIds];
  const newVehicles = parsed.data.newVehicles ?? [];

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

  const status =
    tier.priceCents === 0 ? ("CONFIRMED" as const) : ("PENDING" as const);

  const registration = await prisma.$transaction(async (tx) => {
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

    const reg = await tx.registration.create({
      data: {
        eventId,
        userId: user.id,
        tierId: tier.id,
        status,
      },
    });

    for (const vid of allVehicleIds) {
      await tx.registrationVehicle.create({
        data: {
          registrationId: reg.id,
          vehicleId: vid,
        },
      });
    }

    return reg;
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
    { status: 201 }
  );
}
