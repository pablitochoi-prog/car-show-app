import { prisma } from "@/lib/db";
import { r2Buckets } from "@/lib/r2";
import { uploadPrivateAsset } from "@/lib/storage/private-assets";
import {
  GARAGE_PHOTO_CONTENT_TYPES,
  GARAGE_PHOTO_MAX_BYTES,
  garagePhotoViewPath,
  privateVehiclePhotoKeyPrefix,
  syncVehiclePrimaryPhotoUrl,
} from "@/lib/vehicle-photo-access";

function extensionFromFilename(filename: string, contentType: string): string {
  const raw = filename.split(".").pop()?.toLowerCase() ?? "";
  if (/^[a-z0-9]{2,5}$/.test(raw)) return raw;

  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return byType[contentType] ?? "bin";
}

export async function savePrivateVehiclePhoto(
  vehicleId: string,
  userId: string,
  file: File,
  options?: { isPrimary?: boolean },
): Promise<
  | { ok: true; photoId: string; viewUrl: string; objectKey: string }
  | { ok: false; error: string; status: number }
> {
  const contentType = file.type || "application/octet-stream";
  if (!GARAGE_PHOTO_CONTENT_TYPES.has(contentType)) {
    return {
      ok: false,
      error: "Use a JPG, PNG, or WebP image.",
      status: 400,
    };
  }

  if (file.size > GARAGE_PHOTO_MAX_BYTES) {
    return {
      ok: false,
      error: "File is too large (max 10MB).",
      status: 400,
    };
  }

  const extension = extensionFromFilename(file.name, contentType);
  const objectKey = `${privateVehiclePhotoKeyPrefix(userId, vehicleId)}/${crypto.randomUUID()}.${extension}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadPrivateAsset(objectKey, bytes, contentType);
  if ("error" in uploaded) {
    return { ok: false, error: uploaded.error, status: 500 };
  }

  const existingCount = await prisma.vehiclePhoto.count({
    where: { vehicleId, status: "READY" },
  });
  const makePrimary = options?.isPrimary === true || existingCount === 0;

  const photo = await prisma.$transaction(async (tx) => {
    if (makePrimary) {
      await tx.vehiclePhoto.updateMany({
        where: { vehicleId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return tx.vehiclePhoto.create({
      data: {
        userId,
        vehicleId,
        bucket: r2Buckets.privateAssets,
        objectKey,
        visibility: "private",
        publicUrl: null,
        originalFilename: file.name,
        contentType,
        sizeBytes: file.size,
        isPrimary: makePrimary,
        status: "READY",
      },
    });
  });

  if (makePrimary) {
    await syncVehiclePrimaryPhotoUrl(vehicleId);
  }

  return {
    ok: true,
    photoId: photo.id,
    viewUrl: garagePhotoViewPath(vehicleId, photo.id),
    objectKey,
  };
}
