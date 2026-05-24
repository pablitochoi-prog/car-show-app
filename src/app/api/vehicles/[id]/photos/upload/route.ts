import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  canAccessVehicle,
} from "@/lib/vehicle-photo-access";
import { savePrivateVehiclePhoto } from "@/lib/save-private-vehicle-photo";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: vehicleId } = await params;
  const allowed = await canAccessVehicle(user, vehicleId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { userId: true },
  });
  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const makePrimary = formData.get("isPrimary") !== "false";
  const saved = await savePrivateVehiclePhoto(
    vehicleId,
    vehicle.userId,
    file,
    { isPrimary: makePrimary },
  );

  if (!saved.ok) {
    return NextResponse.json({ error: saved.error }, { status: saved.status });
  }

  return NextResponse.json({
    id: saved.photoId,
    vehicleId,
    objectKey: saved.objectKey,
    viewUrl: saved.viewUrl,
  });
}
