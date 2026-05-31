import { prisma } from "@/lib/db";
import { findVehicleEntryByCode } from "@/lib/vehicle-entry-lookup";
import type { VehicleEntryRecord } from "@/lib/vehicle-entry-types";

export type PublicVehicleSaleListing = {
  listingId: string;
  description: string | null;
  askingPriceCents: number | null;
  showAskingPricePublicly: boolean;
  allowOffers: boolean;
  minimumOfferCents: number | null;
  photos: Array<{ publicUrl: string }>;
};

export type PublicVehicleSalePageData = {
  entry: VehicleEntryRecord;
  eventShowNumber: number;
  listing: PublicVehicleSaleListing;
};

export async function loadPublicVehicleSalePageData(
  rawCode: string,
): Promise<
  | { kind: "not_found" }
  | { kind: "unavailable"; entry: VehicleEntryRecord }
  | { kind: "ok"; data: PublicVehicleSalePageData }
> {
  const entry = await findVehicleEntryByCode(rawCode);
  if (!entry) return { kind: "not_found" };

  const event = await prisma.event.findUnique({
    where: { id: entry.eventId },
    select: {
      vehicleSaleInquiriesEnabled: true,
      showNumber: true,
    },
  });

  if (!event?.vehicleSaleInquiriesEnabled) {
    return { kind: "unavailable", entry };
  }

  const listingWhere = entry.registrationVehicleId
    ? { registrationVehicleId: entry.registrationVehicleId }
    : {
        registrationId: entry.registrationId,
        guestVehicleIndex: entry.guestVehicleIndex,
      };

  const row = await prisma.vehicleSaleListing.findFirst({
    where: {
      eventId: entry.eventId,
      enabled: true,
      sellerAcknowledgedAt: { not: null },
      ...listingWhere,
    },
    include: {
      photos: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!row) {
    return { kind: "unavailable", entry };
  }

  return {
    kind: "ok",
    data: {
      entry,
      eventShowNumber: event.showNumber,
      listing: {
        listingId: row.id,
        description: row.description,
        askingPriceCents: row.askingPriceCents,
        showAskingPricePublicly: row.showAskingPricePublicly,
        allowOffers: row.allowOffers,
        minimumOfferCents: row.minimumOfferCents,
        photos: row.photos.map((photo) => ({ publicUrl: photo.publicUrl })),
      },
    },
  };
}

/** Resolves the active listing row for inquiry submission (same rules as public page). */
export async function loadActiveVehicleSaleListingForInquiry(
  rawCode: string,
) {
  const result = await loadPublicVehicleSalePageData(rawCode);
  if (result.kind !== "ok") return null;

  const listing = await prisma.vehicleSaleListing.findUnique({
    where: { id: result.data.listing.listingId },
    select: {
      id: true,
      eventId: true,
      sellerUserId: true,
      registrationVehicleId: true,
      guestVehicleIndex: true,
      allowOffers: true,
      minimumOfferCents: true,
      registration: {
        select: {
          user: {
            select: { id: true, email: true, name: true, phone: true },
          },
          guestEmail: true,
          registrantEmail: true,
          guestPhone: true,
          registrantPhone: true,
          guestFirstName: true,
          guestLastName: true,
          registrantFirstName: true,
          registrantLastName: true,
        },
      },
      event: { select: { name: true, showNumber: true } },
    },
  });

  if (!listing) return null;

  return {
    entry: result.data.entry,
    listing,
  };
}
