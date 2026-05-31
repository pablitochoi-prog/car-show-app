import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, writeAccessDeniedResponse } from "@/lib/auth";
import {
  type GuestVehicleRecord,
  parseNumericSuffixFromPublicVehicleId,
  reserveVehiclePublicIds,
} from "@/lib/event-sms-vehicle-id";
import { syncVehicleEntryIndexForRegistration } from "@/lib/vehicle-entry-index";

type RouteParams = { params: Promise<{ id: string }> };

/** Link a pending guest registration to the signed-in user (same email). */
export async function POST(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const writeDenied = writeAccessDeniedResponse(user);
  if (writeDenied) return writeDenied;

  const { id: registrationId } = await params;

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      eventId: true,
      userId: true,
      guestEmail: true,
      guestFirstName: true,
      guestLastName: true,
      guestPhone: true,
      guestVehicles: true,
      registrantFirstName: true,
      registrantLastName: true,
      registrantEmail: true,
      registrantPhone: true,
    },
  });

  if (!registration) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  if (registration.userId) {
    if (registration.userId === user.id) {
      return NextResponse.json({ ok: true, registrationId: registration.id });
    }
    return NextResponse.json({ error: "Registration already claimed" }, { status: 409 });
  }

  const guestEmail = registration.guestEmail?.trim().toLowerCase();
  if (!guestEmail || guestEmail !== user.email.trim().toLowerCase()) {
    return NextResponse.json(
      { error: "This registration must be claimed with the same email used at checkout." },
      { status: 403 },
    );
  }

  const guestList: GuestVehicleRecord[] = Array.isArray(registration.guestVehicles)
    ? (registration.guestVehicles as GuestVehicleRecord[])
    : [];

  await prisma.$transaction(async (tx) => {
    const legacyMissing = guestList.filter((gv) => !gv.publicVehicleId?.trim())
      .length;
    const legacyReserved =
      legacyMissing > 0
        ? await reserveVehiclePublicIds(tx, registration.eventId, legacyMissing)
        : [];
    let legacyIdx = 0;
    const guestVehiclesWithIds: GuestVehicleRecord[] = [];

    for (const gv of guestList) {
      const pid =
        gv.publicVehicleId?.trim() || legacyReserved[legacyIdx++]!;
      guestVehiclesWithIds.push({ ...gv, publicVehicleId: pid });

      const vehicle = await tx.vehicle.create({
        data: {
          userId: user.id,
          year: gv.year,
          make: gv.make.trim(),
          model: gv.model.trim(),
          trim: gv.trim?.trim() || null,
          nickname: gv.nickname?.trim() || null,
          notes: gv.notes?.trim() || null,
          photoUrl: gv.photoUrl?.trim() || null,
        },
      });

      await tx.registrationVehicle.create({
        data: {
          registrationId: registration.id,
          vehicleId: vehicle.id,
          eventCategoryId: gv.eventCategoryId ?? null,
          publicVehicleId: pid,
          displayNumber: parseNumericSuffixFromPublicVehicleId(pid),
        },
      });
    }

    await tx.registration.update({
      where: { id: registration.id },
      data: {
        userId: user.id,
        ...(guestVehiclesWithIds.length > 0
          ? { guestVehicles: guestVehiclesWithIds }
          : {}),
        registrantFirstName:
          registration.registrantFirstName ??
          registration.guestFirstName ??
          user.firstName,
        registrantLastName:
          registration.registrantLastName ??
          registration.guestLastName ??
          user.lastName,
        registrantEmail: user.email,
        registrantPhone:
          registration.registrantPhone ?? registration.guestPhone ?? user.phone,
      },
    });

    await syncVehicleEntryIndexForRegistration(tx, registration.id);
  });

  return NextResponse.json({ ok: true, registrationId: registration.id });
}
