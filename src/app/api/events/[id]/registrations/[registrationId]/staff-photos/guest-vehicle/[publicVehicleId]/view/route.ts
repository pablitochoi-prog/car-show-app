import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readEventRegistrationStaffPhoto } from "@/lib/event-registration-staff-photos";
import { canViewEventRegistrationStaffPhotos } from "@/lib/organizer-registrations-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{
    id: string;
    registrationId: string;
    publicVehicleId: string;
  }>;
};

type GuestVehicleJson = {
  publicVehicleId?: string | null;
  staffPhotoObjectKey?: string | null;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, registrationId, publicVehicleId } = await params;
  const decodedId = decodeURIComponent(publicVehicleId);

  const allowed = await canViewEventRegistrationStaffPhotos(
    user.id,
    eventId,
    user.platformRole,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reg = await prisma.registration.findFirst({
    where: { id: registrationId, eventId },
    select: { guestVehicles: true },
  });
  if (!reg?.guestVehicles) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const list = Array.isArray(reg.guestVehicles)
    ? (reg.guestVehicles as GuestVehicleJson[])
    : [reg.guestVehicles as GuestVehicleJson];

  const match = list.find((gv) => gv.publicVehicleId?.trim() === decodedId);
  const objectKey = match?.staffPhotoObjectKey?.trim();
  if (!objectKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const asset = await readEventRegistrationStaffPhoto(objectKey);
  if ("error" in asset) {
    return NextResponse.json({ error: asset.error }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(asset.bytes), {
    status: 200,
    headers: {
      "Content-Type": asset.contentType || "image/jpeg",
      "Cache-Control": "private, max-age=300",
    },
  });
}
