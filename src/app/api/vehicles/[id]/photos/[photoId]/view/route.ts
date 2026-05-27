import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readPrivateAsset } from "@/lib/storage/private-assets";
import { canAccessVehiclePhoto } from "@/lib/vehicle-photo-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string; photoId: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: vehicleId, photoId } = await params;

  const photo = await prisma.vehiclePhoto.findFirst({
    where: { id: photoId, vehicleId, status: "READY" },
    select: {
      id: true,
      userId: true,
      vehicleId: true,
      objectKey: true,
      contentType: true,
    },
  });

  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await canAccessVehiclePhoto(user, photo);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const asset = await readPrivateAsset(photo.objectKey);
  if ("error" in asset) {
    return NextResponse.json({ error: asset.error }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(asset.bytes), {
    status: 200,
    headers: {
      "Content-Type": photo.contentType || asset.contentType || "image/jpeg",
      "Cache-Control": "private, max-age=300",
    },
  });
}
