import { NextResponse } from "next/server";
import { readEventRegistrationStaffPhoto } from "@/lib/event-registration-staff-photos";
import { findVehicleEntryByCode } from "@/lib/vehicle-entry-lookup";
import { findVehicleEntryPhotoObjectKey } from "@/lib/vehicle-entry-photo";
import { isPublicVotingOpenForEvent } from "@/lib/vehicle-entry-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ vehicleEntryCode: string }>;
};

/** Public event-published vehicle photo (not private garage photos). */
export async function GET(_request: Request, { params }: RouteParams) {
  const { vehicleEntryCode } = await params;
  const entry = await findVehicleEntryByCode(vehicleEntryCode);
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isPublicVotingOpenForEvent(entry.event.status)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const objectKey = await findVehicleEntryPhotoObjectKey(vehicleEntryCode);
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
      "Cache-Control": "public, max-age=3600",
    },
  });
}
