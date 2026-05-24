import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessVehicle, garagePhotoViewPath } from "@/lib/vehicle-photo-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: vehicleId } = await params;
  const allowed = await canAccessVehicle(user, vehicleId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const photos = await prisma.vehiclePhoto.findMany({
    where: { vehicleId, status: "READY" },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      vehicleId: true,
      originalFilename: true,
      contentType: true,
      sizeBytes: true,
      isPrimary: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    photos: photos.map((photo) => ({
      ...photo,
      createdAt: photo.createdAt.toISOString(),
      viewUrl: garagePhotoViewPath(vehicleId, photo.id),
    })),
  });
}
