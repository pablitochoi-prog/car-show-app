import type { Prisma } from "@prisma/client";
import type { GuestVehicleRecord } from "@/lib/event-sms-vehicle-id";
import { prisma } from "@/lib/db";
import { formatEventShowNumber } from "@/lib/event-show-number";

export type SellerInquiryVehicleContext = {
  vehicleLabel: string;
  vehicleEntryCode: string | null;
};

export type SellerInquiryListItem = {
  id: string;
  status: string;
  submittedAt: string;
  buyerName: string;
  buyerEmail: string;
  offerAmountCents: number | null;
  eventLabel: string;
  vehicleLabel: string;
  vehicleEntryCode: string | null;
  contactedAt: string | null;
};

export type SellerInquiryDetail = SellerInquiryListItem & {
  buyerPhone: string | null;
  smsNotificationsOptIn: boolean;
  message: string | null;
  notificationEmailSentAt: string | null;
};

export type AdminSaleInquiryDetail = SellerInquiryDetail & {
  eventId: string;
  listingId: string;
  sellerUserId: string | null;
  smsNotificationsOptInAt: string | null;
  smsNotificationsOptInSource: string | null;
  smsNotificationsConsentTextVersion: string | null;
  ipHash: string | null;
  userAgentHash: string | null;
  notificationSmsSentAt: string | null;
};

const inquiryInclude = {
  event: { select: { name: true, showNumber: true } },
  listing: {
    include: {
      registrationVehicle: {
        select: {
          publicVehicleId: true,
          vehicle: {
            select: { year: true, make: true, model: true, trim: true },
          },
        },
      },
      registration: { select: { guestVehicles: true } },
    },
  },
} as const;

type InquiryRow = Prisma.VehicleSaleInquiryGetPayload<{
  include: typeof inquiryInclude;
}>;

function vehicleContextFromInquiry(row: InquiryRow): SellerInquiryVehicleContext {
  const rv = row.listing.registrationVehicle;
  if (rv) {
    const parts = [
      rv.vehicle.year > 0 ? rv.vehicle.year : null,
      rv.vehicle.make,
      rv.vehicle.model,
      rv.vehicle.trim?.trim() || null,
    ].filter(Boolean);
    return {
      vehicleLabel: parts.join(" "),
      vehicleEntryCode: rv.publicVehicleId,
    };
  }

  const index = row.guestVehicleIndex ?? row.listing.guestVehicleIndex;
  const guestList = Array.isArray(row.listing.registration.guestVehicles)
    ? (row.listing.registration.guestVehicles as GuestVehicleRecord[])
    : [];
  const gv = index != null ? guestList[index] : null;
  if (gv) {
    const parts = [
      gv.year ?? null,
      gv.make,
      gv.model,
      gv.trim?.trim() || null,
    ].filter(Boolean);
    return {
      vehicleLabel: parts.join(" "),
      vehicleEntryCode: gv.publicVehicleId?.trim() || null,
    };
  }

  return { vehicleLabel: "Vehicle", vehicleEntryCode: null };
}

function mapListItem(row: InquiryRow): SellerInquiryListItem {
  const vehicle = vehicleContextFromInquiry(row);
  return {
    id: row.id,
    status: row.status,
    submittedAt: row.submittedAt.toISOString(),
    buyerName: row.buyerName,
    buyerEmail: row.buyerEmail,
    offerAmountCents: row.offerAmountCents,
    eventLabel: `${formatEventShowNumber(row.event.showNumber)} ${row.event.name}`,
    vehicleLabel: vehicle.vehicleLabel,
    vehicleEntryCode: vehicle.vehicleEntryCode,
    contactedAt: row.contactedAt?.toISOString() ?? null,
  };
}

function mapDetail(row: InquiryRow): SellerInquiryDetail {
  return {
    ...mapListItem(row),
    buyerPhone: row.buyerPhone,
    smsNotificationsOptIn: row.smsNotificationsOptIn,
    message: row.message,
    notificationEmailSentAt:
      row.notificationEmailSentAt?.toISOString() ?? null,
  };
}

export async function loadSaleInquiriesForAdmin(): Promise<SellerInquiryListItem[]> {
  const rows = await prisma.vehicleSaleInquiry.findMany({
    include: inquiryInclude,
    orderBy: { submittedAt: "desc" },
    take: 500,
  });

  return rows.map(mapListItem);
}

export async function loadSaleInquiryForAdmin(
  inquiryId: string,
): Promise<AdminSaleInquiryDetail | null> {
  const row = await prisma.vehicleSaleInquiry.findUnique({
    where: { id: inquiryId },
    include: inquiryInclude,
  });
  if (!row) return null;

  return {
    ...mapDetail(row),
    eventId: row.eventId,
    listingId: row.listingId,
    sellerUserId: row.sellerUserId,
    smsNotificationsOptInAt:
      row.smsNotificationsOptInAt?.toISOString() ?? null,
    smsNotificationsOptInSource: row.smsNotificationsOptInSource,
    smsNotificationsConsentTextVersion:
      row.smsNotificationsConsentTextVersion,
    ipHash: row.ipHash,
    userAgentHash: row.userAgentHash,
    notificationSmsSentAt:
      row.notificationSmsSentAt?.toISOString() ?? null,
  };
}

export async function loadSaleInquiriesForSeller(
  sellerUserId: string,
  options?: { includeArchived?: boolean },
): Promise<SellerInquiryListItem[]> {
  const rows = await prisma.vehicleSaleInquiry.findMany({
    where: {
      sellerUserId,
      ...(options?.includeArchived
        ? {}
        : { status: { not: "ARCHIVED" } }),
    },
    include: inquiryInclude,
    orderBy: { submittedAt: "desc" },
    take: 200,
  });

  return rows.map(mapListItem);
}

export async function loadSaleInquiryForSeller(
  sellerUserId: string,
  inquiryId: string,
): Promise<SellerInquiryDetail | null> {
  const row = await prisma.vehicleSaleInquiry.findFirst({
    where: { id: inquiryId, sellerUserId },
    include: inquiryInclude,
  });
  if (!row) return null;

  return mapDetail(row);
}

export function sellerDashboardInquiryUrl(inquiryId: string): string {
  return `/dashboard/sale-inquiries/${inquiryId}`;
}
