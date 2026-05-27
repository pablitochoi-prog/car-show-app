import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { userHasProfilePhoto } from "@/lib/profile-photo-access";
import { publicPhotosR2, r2Buckets } from "@/lib/r2";
import {
  readPrivateAsset,
  uploadPrivateAsset,
} from "@/lib/storage/private-assets";

const STAFF_PHOTO_PREFIX = "event-registration-photos";

export function registrationVehicleStaffPhotoKey(
  eventId: string,
  registrationId: string,
  registrationVehicleId: string,
  extension: string,
): string {
  return `${STAFF_PHOTO_PREFIX}/${eventId}/${registrationId}/vehicles/${registrationVehicleId}.${extension}`;
}

export function registrationRegistrantStaffPhotoKey(
  eventId: string,
  registrationId: string,
  extension: string,
): string {
  return `${STAFF_PHOTO_PREFIX}/${eventId}/${registrationId}/registrant.${extension}`;
}

export function guestVehicleStaffPhotoKey(
  eventId: string,
  registrationId: string,
  publicVehicleId: string,
  extension: string,
): string {
  const safeId = publicVehicleId.replace(/[^A-Za-z0-9-]/g, "_");
  return `${STAFF_PHOTO_PREFIX}/${eventId}/${registrationId}/guest-vehicles/${safeId}.${extension}`;
}

export function registrationVehicleStaffPhotoViewPath(
  eventId: string,
  registrationId: string,
  registrationVehicleId: string,
): string {
  return `/api/events/${eventId}/registrations/${registrationId}/staff-photos/vehicle/${registrationVehicleId}/view`;
}

export function registrationRegistrantStaffPhotoViewPath(
  eventId: string,
  registrationId: string,
): string {
  return `/api/events/${eventId}/registrations/${registrationId}/staff-photos/registrant/view`;
}

export function guestVehicleStaffPhotoViewPath(
  eventId: string,
  registrationId: string,
  publicVehicleId: string,
): string {
  return `/api/events/${eventId}/registrations/${registrationId}/staff-photos/guest-vehicle/${encodeURIComponent(publicVehicleId)}/view`;
}

export function isEventRegistrationStaffPhotoKey(objectKey: string): boolean {
  return objectKey.startsWith(`${STAFF_PHOTO_PREFIX}/`);
}

function extensionFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[contentType] ?? "jpg";
}

async function copyPrivateObject(
  sourceKey: string,
  destKey: string,
): Promise<string | null> {
  const asset = await readPrivateAsset(sourceKey);
  if ("error" in asset) return null;

  const contentType = asset.contentType ?? "image/jpeg";
  const uploaded = await uploadPrivateAsset(destKey, asset.bytes, contentType);
  if ("error" in uploaded) return null;
  return destKey;
}

async function copyPublicObjectKey(
  sourceKey: string,
  destKey: string,
): Promise<string | null> {
  try {
    const response = await publicPhotosR2.send(
      new GetObjectCommand({
        Bucket: r2Buckets.publicPhotos,
        Key: sourceKey,
      }),
    );
    if (!response.Body) return null;
    const bytes = Buffer.from(await response.Body.transformToByteArray());
    const contentType = response.ContentType ?? "image/jpeg";
    const uploaded = await uploadPrivateAsset(destKey, bytes, contentType);
    if ("error" in uploaded) return null;
    return destKey;
  } catch {
    return null;
  }
}

function publicUrlToObjectKey(url: string): string | null {
  const base = process.env.R2_PUBLIC_PHOTOS_BASE_URL?.replace(/\/$/, "");
  if (base && url.startsWith(`${base}/`)) {
    return url.slice(base.length + 1);
  }
  const guestMatch = url.match(/guest-vehicle-photos\/[^?#]+/);
  if (guestMatch) return guestMatch[0];
  const legacyMatch = url.match(/vehicle-photos\/[^?#]+/);
  if (legacyMatch) return legacyMatch[0];
  return null;
}

async function resolveGarageVehicleSourceObjectKey(
  vehicleId: string,
): Promise<{ objectKey: string; contentType: string; isPublic: boolean } | null> {
  const photo = await prisma.vehiclePhoto.findFirst({
    where: { vehicleId, status: "READY" },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    select: { objectKey: true, contentType: true },
  });
  if (photo) {
    return {
      objectKey: photo.objectKey,
      contentType: photo.contentType,
      isPublic: false,
    };
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { photoUrl: true },
  });
  if (!vehicle?.photoUrl) return null;

  const publicKey = publicUrlToObjectKey(vehicle.photoUrl);
  if (publicKey) {
    return { objectKey: publicKey, contentType: "image/jpeg", isPublic: true };
  }

  return null;
}

async function copyVehicleSourceToStaffPhoto(
  source: { objectKey: string; contentType: string; isPublic: boolean },
  destKey: string,
): Promise<string | null> {
  if (source.isPublic) {
    return copyPublicObjectKey(source.objectKey, destKey);
  }
  return copyPrivateObject(source.objectKey, destKey);
}

export async function syncRegistrationStaffPhotos(
  registrationId: string,
): Promise<void> {
  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: {
      vehicles: { select: { id: true, vehicleId: true } },
      user: { select: { avatarUrl: true } },
    },
  });
  if (!reg) return;

  if (reg.userId && userHasProfilePhoto(reg.user?.avatarUrl)) {
    const avatarKey = reg.user!.avatarUrl!;
    const ext =
      avatarKey.split(".").pop()?.toLowerCase() ||
      extensionFromContentType("image/jpeg");
    const destKey = registrationRegistrantStaffPhotoKey(
      reg.eventId,
      registrationId,
      ext,
    );
    const copied = await copyPrivateObject(avatarKey, destKey);
    await prisma.registration.update({
      where: { id: registrationId },
      data: { registrantPhotoObjectKey: copied },
    });
  } else {
    await prisma.registration.update({
      where: { id: registrationId },
      data: { registrantPhotoObjectKey: null },
    });
  }

  for (const rv of reg.vehicles) {
    const source = await resolveGarageVehicleSourceObjectKey(rv.vehicleId);
    if (!source) {
      await prisma.registrationVehicle.update({
        where: { id: rv.id },
        data: { eventPhotoObjectKey: null },
      });
      continue;
    }

    const ext = extensionFromContentType(source.contentType);
    const destKey = registrationVehicleStaffPhotoKey(
      reg.eventId,
      registrationId,
      rv.id,
      ext,
    );
    const copied = await copyVehicleSourceToStaffPhoto(source, destKey);
    await prisma.registrationVehicle.update({
      where: { id: rv.id },
      data: { eventPhotoObjectKey: copied },
    });
  }
}

type GuestVehicleJson = {
  photoUrl?: string | null;
  publicVehicleId?: string | null;
  staffPhotoObjectKey?: string | null;
  [key: string]: unknown;
};

export async function syncGuestRegistrationStaffPhotos(
  registrationId: string,
): Promise<void> {
  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { eventId: true, guestVehicles: true },
  });
  if (!reg?.guestVehicles) return;

  const list = Array.isArray(reg.guestVehicles)
    ? (reg.guestVehicles as GuestVehicleJson[])
    : [reg.guestVehicles as GuestVehicleJson];

  let changed = false;
  const updated: GuestVehicleJson[] = [];

  for (const gv of list) {
    const next = { ...gv };
    const publicVehicleId = gv.publicVehicleId?.trim();
    const photoUrl = gv.photoUrl?.trim();

    if (publicVehicleId && photoUrl) {
      const publicKey = publicUrlToObjectKey(photoUrl);
      if (publicKey) {
        const ext = publicKey.split(".").pop()?.toLowerCase() || "jpg";
        const destKey = guestVehicleStaffPhotoKey(
          reg.eventId,
          registrationId,
          publicVehicleId,
          ext,
        );
        const copied = await copyPublicObjectKey(publicKey, destKey);
        next.staffPhotoObjectKey = copied;
        changed = true;
      }
    } else {
      next.staffPhotoObjectKey = null;
    }

    updated.push(next);
  }

  if (changed) {
    await prisma.registration.update({
      where: { id: registrationId },
      data: { guestVehicles: updated as Prisma.InputJsonValue },
    });
  }
}

export async function syncAllRegistrationStaffPhotos(
  registrationId: string,
): Promise<void> {
  await syncRegistrationStaffPhotos(registrationId);
  await syncGuestRegistrationStaffPhotos(registrationId);
}

export async function readEventRegistrationStaffPhoto(objectKey: string) {
  if (!isEventRegistrationStaffPhotoKey(objectKey)) {
    return { error: "Invalid object key" } as const;
  }
  return readPrivateAsset(objectKey);
}
