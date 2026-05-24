import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { r2Buckets } from "@/lib/r2";
import { isValidUploadPurpose } from "@/lib/upload-destinations";
import {
  canAccessVehicle,
  GARAGE_PHOTO_CONTENT_TYPES,
  GARAGE_PHOTO_MAX_BYTES,
  garagePhotoViewPath,
  objectKeyMatchesPrivateVehiclePhoto,
  syncVehiclePrimaryPhotoUrl,
} from "@/lib/vehicle-photo-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const completeSchema = z.object({
  uploadPurpose: z.string().min(1),
  bucket: z.string().min(1),
  objectKey: z.string().min(1),
  visibility: z.enum(["public", "private"]),
  originalFilename: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  vehicleId: z.string().uuid().optional(),
  isPrimary: z.boolean().optional(),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const data = parsed.data;
  if (!isValidUploadPurpose(data.uploadPurpose)) {
    return NextResponse.json({ error: "Invalid uploadPurpose" }, { status: 400 });
  }

  if (data.uploadPurpose !== "privateVehiclePhoto") {
    return NextResponse.json(
      { error: "Unsupported uploadPurpose for this endpoint" },
      { status: 400 },
    );
  }

  if (!data.vehicleId) {
    return NextResponse.json({ error: "vehicleId is required" }, { status: 400 });
  }

  if (data.bucket !== r2Buckets.privateAssets) {
    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
  }

  if (data.visibility !== "private") {
    return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
  }

  if (!GARAGE_PHOTO_CONTENT_TYPES.has(data.contentType)) {
    return NextResponse.json({ error: "Unsupported contentType" }, { status: 400 });
  }

  if (data.sizeBytes > GARAGE_PHOTO_MAX_BYTES) {
    return NextResponse.json(
      { error: "File is too large (max 10MB)" },
      { status: 400 },
    );
  }

  const allowed = await canAccessVehicle(user, data.vehicleId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: data.vehicleId },
    select: { userId: true },
  });
  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  if (
    !objectKeyMatchesPrivateVehiclePhoto(
      data.objectKey,
      vehicle.userId,
      data.vehicleId,
    )
  ) {
    return NextResponse.json({ error: "Invalid objectKey" }, { status: 400 });
  }

  const existingCount = await prisma.vehiclePhoto.count({
    where: { vehicleId: data.vehicleId, status: "READY" },
  });
  const makePrimary = data.isPrimary === true || existingCount === 0;

  const photo = await prisma.$transaction(async (tx) => {
    if (makePrimary) {
      await tx.vehiclePhoto.updateMany({
        where: { vehicleId: data.vehicleId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return tx.vehiclePhoto.create({
      data: {
        userId: vehicle.userId,
        vehicleId: data.vehicleId,
        bucket: data.bucket,
        objectKey: data.objectKey,
        visibility: "private",
        publicUrl: null,
        originalFilename: data.originalFilename,
        contentType: data.contentType,
        sizeBytes: data.sizeBytes,
        isPrimary: makePrimary,
        status: "READY",
      },
    });
  });

  if (makePrimary) {
    await syncVehiclePrimaryPhotoUrl(data.vehicleId);
  }

  return NextResponse.json({
    id: photo.id,
    vehicleId: photo.vehicleId,
    bucket: photo.bucket,
    objectKey: photo.objectKey,
    visibility: photo.visibility,
    publicUrl: photo.publicUrl,
    originalFilename: photo.originalFilename,
    contentType: photo.contentType,
    sizeBytes: photo.sizeBytes,
    isPrimary: photo.isPrimary,
    status: photo.status,
    createdAt: photo.createdAt.toISOString(),
    viewUrl: `/api/vehicles/${photo.vehicleId}/photos/${photo.id}/view`,
  });
}
