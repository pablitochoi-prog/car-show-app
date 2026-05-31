import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePublicVehicleSalePage } from "@/lib/revalidate-vehicle-sale-pages";
import { syncVehicleSaleListingsForLoggedInVehicles } from "@/lib/sync-vehicle-sale-listings";
import { vehicleSaleListingInputSchema } from "@/lib/validation/vehicle-sale-listing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  vehicleId: z.string().uuid(),
  saleListing: vehicleSaleListingInputSchema,
});

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "Invalid sale listing payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { vehicleId, saleListing } = parsed.data;

  const [event, registration] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      select: { vehicleSaleInquiriesEnabled: true },
    }),
    prisma.registration.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
      select: { id: true, status: true },
    }),
  ]);

  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  if (!registration || registration.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Registration not found for this event." },
      { status: 404 },
    );
  }

  const onRegistration = await prisma.registrationVehicle.findFirst({
    where: { registrationId: registration.id, vehicleId },
    select: { id: true, publicVehicleId: true },
  });
  if (!onRegistration) {
    return NextResponse.json(
      { error: "This vehicle is not on your registration." },
      { status: 400 },
    );
  }

  const saleError = await prisma.$transaction((tx) =>
    syncVehicleSaleListingsForLoggedInVehicles(tx, {
      eventId,
      registrationId: registration.id,
      sellerUserId: user.id,
      vehicleIdsInOrder: [vehicleId],
      listingsByVehicleId: { [vehicleId]: saleListing },
      saleFeatureEnabled: event.vehicleSaleInquiriesEnabled === true,
    }),
  );

  if (saleError) {
    return NextResponse.json({ error: saleError }, { status: 400 });
  }

  if (onRegistration.publicVehicleId?.trim()) {
    revalidatePublicVehicleSalePage(onRegistration.publicVehicleId);
  }

  return NextResponse.json({ ok: true });
}
