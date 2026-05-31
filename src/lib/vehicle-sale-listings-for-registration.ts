import { prisma } from "@/lib/db";

export type VehicleSaleListingSnapshot = {
  listingId: string;
  enabled: boolean;
  askingPriceCents: number | null;
  showAskingPricePublicly: boolean;
  allowOffers: boolean;
  minimumOfferCents: number | null;
  description: string | null;
  sellerAcknowledged: boolean;
  photos: Array<{
    publicUrl: string;
    objectKey: string;
    sortOrder: number;
    originalFilename: string | null;
    contentType: string | null;
  }>;
};

export async function loadVehicleSaleListingsByVehicleId(
  registrationId: string,
): Promise<Record<string, VehicleSaleListingSnapshot>> {
  const rows = await prisma.vehicleSaleListing.findMany({
    where: { registrationId, registrationVehicleId: { not: null } },
    include: {
      photos: { orderBy: { sortOrder: "asc" } },
      registrationVehicle: { select: { vehicleId: true } },
    },
  });

  const out: Record<string, VehicleSaleListingSnapshot> = {};
  for (const row of rows) {
    const vehicleId = row.registrationVehicle?.vehicleId;
    if (!vehicleId) continue;
    out[vehicleId] = mapListingRow(row);
  }
  return out;
}

export async function loadVehicleSaleListingsByGuestIndex(
  registrationId: string,
): Promise<Record<number, VehicleSaleListingSnapshot>> {
  const rows = await prisma.vehicleSaleListing.findMany({
    where: { registrationId, guestVehicleIndex: { not: null } },
    include: {
      photos: { orderBy: { sortOrder: "asc" } },
    },
  });

  const out: Record<number, VehicleSaleListingSnapshot> = {};
  for (const row of rows) {
    if (row.guestVehicleIndex == null) continue;
    out[row.guestVehicleIndex] = mapListingRow(row);
  }
  return out;
}

function mapListingRow(
  row: {
    id: string;
    enabled: boolean;
    askingPriceCents: number | null;
    showAskingPricePublicly: boolean;
    allowOffers: boolean;
    minimumOfferCents: number | null;
    description: string | null;
    sellerAcknowledgedAt: Date | null;
    photos: Array<{
      publicUrl: string;
      objectKey: string;
      sortOrder: number;
      originalFilename: string | null;
      contentType: string | null;
    }>;
  },
): VehicleSaleListingSnapshot {
  return {
    listingId: row.id,
    enabled: row.enabled,
    askingPriceCents: row.askingPriceCents,
    showAskingPricePublicly: row.showAskingPricePublicly,
    allowOffers: row.allowOffers,
    minimumOfferCents: row.minimumOfferCents,
    description: row.description,
    sellerAcknowledged: row.sellerAcknowledgedAt != null,
    photos: row.photos.map((photo) => ({
      publicUrl: photo.publicUrl,
      objectKey: photo.objectKey,
      sortOrder: photo.sortOrder,
      originalFilename: photo.originalFilename,
      contentType: photo.contentType,
    })),
  };
}
