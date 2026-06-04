import { prisma } from "@/lib/db";
import { garagePhotoViewPath } from "@/lib/vehicle-photo-access";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Garage `Vehicle` row the signed-in user owns (not an event entry code page). */
export async function getOwnedGarageVehicle(
  userId: string,
  idOrEntryCode: string,
) {
  const param = idOrEntryCode.trim();
  if (!param) return null;

  if (UUID_RE.test(param)) {
    return prisma.vehicle.findFirst({
      where: { id: param, userId, archivedAt: null },
    });
  }

  // Legacy/wrong links that used a show entry code in the URL — map to garage vehicle.
  const code = param.toUpperCase();
  const row = await prisma.registrationVehicle.findFirst({
    where: {
      publicVehicleId: code,
      registration: { userId },
      vehicle: { userId, archivedAt: null },
    },
    select: { vehicle: true },
  });

  return row?.vehicle ?? null;
}

export type GarageVehicleListItem = {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  nickname: string | null;
  vin: string | null;
  notes: string | null;
  photoUrl: string | null;
};

/** Load saved garage vehicles for My Vehicles (never event-only entries). */
export async function loadGarageVehiclesForUser(
  userId: string,
): Promise<GarageVehicleListItem[]> {
  const vehicles = await prisma.vehicle.findMany({
    where: { userId, archivedAt: null },
    orderBy: [{ year: "desc" }, { make: "asc" }, { model: "asc" }],
    select: {
      id: true,
      year: true,
      make: true,
      model: true,
      trim: true,
      nickname: true,
      vin: true,
      notes: true,
      photoUrl: true,
      photos: {
        where: { isPrimary: true, status: "READY" },
        take: 1,
        select: { id: true },
      },
    },
  });

  return vehicles.map((v) => {
    let photoUrl = v.photoUrl;
    const primary = v.photos[0];
    if (primary) {
      photoUrl = garagePhotoViewPath(v.id, primary.id);
    }
    return {
      id: v.id,
      year: v.year,
      make: v.make,
      model: v.model,
      trim: v.trim,
      nickname: v.nickname,
      vin: v.vin,
      notes: v.notes,
      photoUrl,
    };
  });
}
