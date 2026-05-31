import type { Prisma } from "@prisma/client";
import { isEventAssetsPublicUrl } from "@/lib/storage/public-asset-url";
import {
  normalizeVehicleSaleListingInput,
  type VehicleSaleListingInput,
  type VehicleSalePhotoInput,
} from "@/lib/validation/vehicle-sale-listing";

type Tx = Prisma.TransactionClient;

function salePhotoPathPrefix(eventId: string, listingId: string): string {
  return `events/${eventId}/sale-listings/${listingId}/`;
}

function validateSalePhotos(
  eventId: string,
  listingId: string,
  photos: VehicleSalePhotoInput[],
): string | null {
  for (const photo of photos) {
    if (!isEventAssetsPublicUrl(photo.publicUrl)) {
      return "Sale listing photos must be uploaded through this app.";
    }
    const prefix = salePhotoPathPrefix(eventId, listingId);
    if (
      photo.objectKey &&
      !photo.objectKey.startsWith(prefix)
    ) {
      return "Invalid sale listing photo.";
    }
    try {
      const url = new URL(photo.publicUrl);
      if (!url.pathname.includes(`/sale-listings/${listingId}/`)) {
        return "Invalid sale listing photo.";
      }
    } catch {
      return "Invalid sale listing photo.";
    }
  }
  return null;
}

async function replaceListingPhotos(
  tx: Tx,
  listingId: string,
  photos: VehicleSalePhotoInput[],
) {
  await tx.vehicleSalePhoto.deleteMany({ where: { listingId } });
  if (photos.length === 0) return;

  await tx.vehicleSalePhoto.createMany({
    data: photos.map((photo, index) => ({
      listingId,
      publicUrl: photo.publicUrl,
      objectKey:
        photo.objectKey ??
        `sale-listing-photo/${listingId}/${index}-${crypto.randomUUID()}`,
      sortOrder: photo.sortOrder ?? index,
      originalFilename: photo.originalFilename ?? null,
      contentType: photo.contentType ?? null,
    })),
  });
}

async function upsertListing(
  tx: Tx,
  args: {
    eventId: string;
    registrationId: string;
    registrationVehicleId?: string | null;
    guestVehicleIndex?: number | null;
    sellerUserId?: string | null;
    existingListingId?: string | null;
    input: VehicleSaleListingInput;
  },
): Promise<string | null> {
  const normalized = normalizeVehicleSaleListingInput(args.input);
  const listingId = args.existingListingId ?? normalized.listingId ?? crypto.randomUUID();

  const photoError = validateSalePhotos(
    args.eventId,
    listingId,
    normalized.photos,
  );
  if (photoError) return photoError;

  const listingFields = {
    askingPriceCents: normalized.askingPriceCents,
    showAskingPricePublicly: normalized.showAskingPricePublicly,
    allowOffers: normalized.allowOffers,
    minimumOfferCents: normalized.minimumOfferCents,
    description: normalized.description,
  };

  if (!normalized.enabled) {
    if (args.existingListingId) {
      await tx.vehicleSaleListing.update({
        where: { id: args.existingListingId },
        data: {
          enabled: false,
          ...listingFields,
        },
      });
      await replaceListingPhotos(tx, args.existingListingId, normalized.photos);
    }
    return null;
  }

  const acknowledgedAt =
    normalized.sellerAcknowledgedAt ??
    (args.existingListingId
      ? (
          await tx.vehicleSaleListing.findUnique({
            where: { id: args.existingListingId },
            select: { sellerAcknowledgedAt: true },
          })
        )?.sellerAcknowledgedAt ?? null
      : null);

  const listing = await tx.vehicleSaleListing.upsert({
    where: args.existingListingId
      ? { id: args.existingListingId }
      : args.registrationVehicleId
        ? { registrationVehicleId: args.registrationVehicleId }
        : {
            registrationId_guestVehicleIndex: {
              registrationId: args.registrationId,
              guestVehicleIndex: args.guestVehicleIndex ?? 0,
            },
          },
    create: {
      id: listingId,
      eventId: args.eventId,
      registrationId: args.registrationId,
      registrationVehicleId: args.registrationVehicleId ?? null,
      guestVehicleIndex: args.guestVehicleIndex ?? null,
      sellerUserId: args.sellerUserId ?? null,
      enabled: true,
      ...listingFields,
      sellerAcknowledgedAt: normalized.sellerAcknowledgedAt ?? acknowledgedAt,
    },
    update: {
      sellerUserId: args.sellerUserId ?? null,
      enabled: true,
      ...listingFields,
      sellerAcknowledgedAt: normalized.sellerAcknowledgedAt ?? acknowledgedAt,
    },
    select: { id: true },
  });

  await replaceListingPhotos(tx, listing.id, normalized.photos);
  return null;
}

export async function syncVehicleSaleListingsForLoggedInVehicles(
  tx: Tx,
  args: {
    eventId: string;
    registrationId: string;
    sellerUserId: string;
    vehicleIdsInOrder: string[];
    listingsByVehicleId: Record<string, VehicleSaleListingInput> | undefined;
    saleFeatureEnabled: boolean;
  },
): Promise<string | null> {
  if (!args.saleFeatureEnabled) {
    await tx.vehicleSaleListing.updateMany({
      where: { registrationId: args.registrationId },
      data: { enabled: false },
    });
    return null;
  }

  const regVehicles = await tx.registrationVehicle.findMany({
    where: { registrationId: args.registrationId },
    select: { id: true, vehicleId: true },
  });
  const rvByVehicleId = new Map(
    regVehicles.map((row) => [row.vehicleId, row.id] as const),
  );

  const existingListings = await tx.vehicleSaleListing.findMany({
    where: { registrationId: args.registrationId },
    select: {
      id: true,
      registrationVehicleId: true,
      registrationVehicle: { select: { vehicleId: true } },
    },
  });
  const listingByVehicleId = new Map<string, string>();
  for (const listing of existingListings) {
    const vehicleId = listing.registrationVehicle?.vehicleId;
    if (vehicleId) listingByVehicleId.set(vehicleId, listing.id);
  }

  const activeVehicleIds = new Set(args.vehicleIdsInOrder);

  for (const vehicleId of args.vehicleIdsInOrder) {
    const registrationVehicleId = rvByVehicleId.get(vehicleId);
    if (!registrationVehicleId) continue;

    const input = args.listingsByVehicleId?.[vehicleId];
    if (!input) {
      const existingId = listingByVehicleId.get(vehicleId);
      if (existingId) {
        await tx.vehicleSaleListing.update({
          where: { id: existingId },
          data: { enabled: false },
        });
      }
      continue;
    }

    const error = await upsertListing(tx, {
      eventId: args.eventId,
      registrationId: args.registrationId,
      registrationVehicleId,
      sellerUserId: args.sellerUserId,
      existingListingId: listingByVehicleId.get(vehicleId),
      input,
    });
    if (error) return error;
  }

  for (const listing of existingListings) {
    const vehicleId = listing.registrationVehicle?.vehicleId;
    if (vehicleId && !activeVehicleIds.has(vehicleId)) {
      await tx.vehicleSaleListing.update({
        where: { id: listing.id },
        data: { enabled: false },
      });
    }
  }

  return null;
}

export async function syncVehicleSaleListingsForGuestVehicles(
  tx: Tx,
  args: {
    eventId: string;
    registrationId: string;
    vehicleCount: number;
    listingsByIndex: Array<VehicleSaleListingInput | undefined> | undefined;
    saleFeatureEnabled: boolean;
  },
): Promise<string | null> {
  if (!args.saleFeatureEnabled) {
    await tx.vehicleSaleListing.updateMany({
      where: { registrationId: args.registrationId },
      data: { enabled: false },
    });
    return null;
  }

  const existingListings = await tx.vehicleSaleListing.findMany({
    where: { registrationId: args.registrationId },
    select: { id: true, guestVehicleIndex: true },
  });
  const listingByIndex = new Map<number, string>();
  for (const listing of existingListings) {
    if (listing.guestVehicleIndex != null) {
      listingByIndex.set(listing.guestVehicleIndex, listing.id);
    }
  }

  for (let index = 0; index < args.vehicleCount; index++) {
    const input = args.listingsByIndex?.[index];
    if (!input) {
      const existingId = listingByIndex.get(index);
      if (existingId) {
        await tx.vehicleSaleListing.update({
          where: { id: existingId },
          data: { enabled: false },
        });
      }
      continue;
    }

    const error = await upsertListing(tx, {
      eventId: args.eventId,
      registrationId: args.registrationId,
      guestVehicleIndex: index,
      sellerUserId: null,
      existingListingId: listingByIndex.get(index),
      input,
    });
    if (error) return error;
  }

  for (const listing of existingListings) {
    if (
      listing.guestVehicleIndex != null &&
      listing.guestVehicleIndex >= args.vehicleCount
    ) {
      await tx.vehicleSaleListing.update({
        where: { id: listing.id },
        data: { enabled: false },
      });
    }
  }

  return null;
}
