import { prisma } from "@/lib/db";
import { findVehicleEntryByCode } from "@/lib/vehicle-entry-lookup";
import type { VehicleEntryRecord } from "@/lib/vehicle-entry-types";
import {
  toPublicVehicleSaleListing,
  type PublicVehicleSaleListing,
} from "@/lib/public-vehicle-sale-listing-map";
import { buyerInquiryNoticeForListing } from "@/lib/vehicle-buyer-inquiry-notice";

export {
  BUYER_INQUIRIES_UNAVAILABLE_MESSAGE,
  buyerInquiryNoticeForListing,
} from "@/lib/vehicle-buyer-inquiry-notice";

export type { PublicVehicleSaleListing } from "@/lib/public-vehicle-sale-listing-map";

export type PublicVehicleSalePageData = {
  entry: VehicleEntryRecord;
  eventShowNumber: number;
  listing: PublicVehicleSaleListing;
  /** False when the owner turned off buyer inquiries but listing details remain visible. */
  inquiriesOpen: boolean;
};

function listingWhereForEntry(entry: VehicleEntryRecord) {
  return entry.registrationVehicleId
    ? { registrationVehicleId: entry.registrationVehicleId }
    : {
        registrationId: entry.registrationId,
        guestVehicleIndex: entry.guestVehicleIndex,
      };
}

export async function loadVehicleBuyerInquiryNotice(
  entry: VehicleEntryRecord,
): Promise<string | null> {
  const event = await prisma.event.findUnique({
    where: { id: entry.eventId },
    select: { vehicleSaleInquiriesEnabled: true, showNumber: true, name: true },
  });
  if (!event?.vehicleSaleInquiriesEnabled) return null;

  const row = await prisma.vehicleSaleListing.findFirst({
    where: {
      eventId: entry.eventId,
      ...listingWhereForEntry(entry),
    },
    select: { enabled: true, sellerAcknowledgedAt: true },
  });

  const { formatEventShowNumber } = await import("@/lib/event-show-number");
  const eventLabel = `${formatEventShowNumber(event.showNumber)} ${event.name}`;

  return buyerInquiryNoticeForListing(row, eventLabel);
}

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

  const row = await prisma.vehicleSaleListing.findFirst({
    where: {
      eventId: entry.eventId,
      ...listingWhereForEntry(entry),
    },
    include: {
      photos: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!row || !row.sellerAcknowledgedAt) {
    return { kind: "unavailable", entry };
  }

  const inquiriesOpen = row.enabled;

  return {
    kind: "ok",
    data: {
      entry,
      eventShowNumber: event.showNumber,
      listing: toPublicVehicleSaleListing(row),
      inquiriesOpen,
    },
  };
}

/** Resolves the active listing row for inquiry submission (open listings only). */
export async function loadActiveVehicleSaleListingForInquiry(
  rawCode: string,
) {
  const result = await loadPublicVehicleSalePageData(rawCode);
  if (result.kind !== "ok" || !result.data.inquiriesOpen) return null;

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
          userId: true,
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
      event: { select: { name: true, showNumber: true, orgId: true } },
    },
  });

  if (!listing) return null;

  return {
    entry: result.data.entry,
    listing,
  };
}
