import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  canAccessVehiclePhoto,
  syncVehiclePrimaryPhotoUrl,
} from "@/lib/vehicle-photo-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string; photoId: string }>;
};

export async function PATCH(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: vehicleId, photoId } = await params;

  const photo = await prisma.vehiclePhoto.findFirst({
    where: { id: photoId, vehicleId, status: "READY" },
    select: { id: true, userId: true, vehicleId: true },
  });

  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await canAccessVehiclePhoto(user, photo);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.vehiclePhoto.updateMany({
      where: { vehicleId, isPrimary: true },
      data: { isPrimary: false },
    }),
    prisma.vehiclePhoto.update({
      where: { id: photoId },
      data: { isPrimary: true },
    }),
  ]);

  await syncVehiclePrimaryPhotoUrl(vehicleId);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: vehicleId, photoId } = await params;

  const photo = await prisma.vehiclePhoto.findFirst({
    where: { id: photoId, vehicleId },
    select: { id: true, userId: true, vehicleId: true, isPrimary: true },
  });

  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await canAccessVehiclePhoto(user, photo);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.vehiclePhoto.delete({ where: { id: photoId } });

  if (photo.isPrimary) {
    const nextPrimary = await prisma.vehiclePhoto.findFirst({
      where: { vehicleId, status: "READY" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (nextPrimary) {
      await prisma.vehiclePhoto.update({
        where: { id: nextPrimary.id },
        data: { isPrimary: true },
      });
    }

    await syncVehiclePrimaryPhotoUrl(vehicleId);
  }

  return NextResponse.json({ ok: true });
}
