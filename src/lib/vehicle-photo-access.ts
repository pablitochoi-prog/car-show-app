import { isSiteAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";

export const GARAGE_PHOTO_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const GARAGE_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export function garagePhotoViewPath(vehicleId: string, photoId: string): string {
  return `/api/vehicles/${vehicleId}/photos/${photoId}/view`;
}

export function isGaragePhotoViewUrl(url: string): boolean {
  return (
    url.startsWith("/api/vehicles/") &&
    url.includes("/photos/") &&
    url.endsWith("/view")
  );
}

export function privateVehiclePhotoKeyPrefix(
  userId: string,
  vehicleId: string,
): string {
  return `vehicle-photos/${userId}/${vehicleId}`;
}

export function objectKeyMatchesPrivateVehiclePhoto(
  objectKey: string,
  userId: string,
  vehicleId: string,
): boolean {
  const prefix = `${privateVehiclePhotoKeyPrefix(userId, vehicleId)}/`;
  return objectKey.startsWith(prefix) && !objectKey.includes("\\");
}

export async function userOwnsVehicle(
  userId: string,
  vehicleId: string,
): Promise<boolean> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId },
    select: { id: true },
  });
  return Boolean(vehicle);
}

export async function canAccessVehicle(
  user: Pick<User, "id" | "platformRole">,
  vehicleId: string,
): Promise<boolean> {
  if (isSiteAdmin(user)) return true;
  return userOwnsVehicle(user.id, vehicleId);
}

export async function canAccessVehiclePhoto(
  user: Pick<User, "id" | "platformRole">,
  photo: { userId: string; vehicleId: string },
): Promise<boolean> {
  if (isSiteAdmin(user)) return true;
  return photo.userId === user.id;
}

export async function syncVehiclePrimaryPhotoUrl(vehicleId: string) {
  const primary = await prisma.vehiclePhoto.findFirst({
    where: { vehicleId, isPrimary: true, status: "READY" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      photoUrl: primary ? garagePhotoViewPath(vehicleId, primary.id) : null,
    },
  });
}
