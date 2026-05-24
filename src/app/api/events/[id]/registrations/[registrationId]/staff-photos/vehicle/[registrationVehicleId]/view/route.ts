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
    registrationVehicleId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId, registrationId, registrationVehicleId } = await params;

  const allowed = await canViewEventRegistrationStaffPhotos(
    user.id,
    eventId,
    user.platformRole,
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const row = await prisma.registrationVehicle.findFirst({
    where: {
      id: registrationVehicleId,
      registrationId,
      registration: { eventId },
    },
    select: { eventPhotoObjectKey: true },
  });

  if (!row?.eventPhotoObjectKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const asset = await readEventRegistrationStaffPhoto(row.eventPhotoObjectKey);
  if ("error" in asset) {
    return NextResponse.json({ error: asset.error }, { status: 404 });
  }

  return new NextResponse(asset.bytes, {
    status: 200,
    headers: {
      "Content-Type": asset.contentType || "image/jpeg",
      "Cache-Control": "private, max-age=300",
    },
  });
}
