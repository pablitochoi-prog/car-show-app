import { prisma } from "@/lib/db";

export const VEHICLE_SALE_INQUIRY_RATE_LIMITS = {
  perListingPerHour: 5,
  perIpHashPerHour: 10,
  perEmailPerHour: 5,
} as const;

export function vehicleSaleInquiryRateLimitWindowStart(now = new Date()): Date {
  return new Date(now.getTime() - 60 * 60 * 1000);
}

export type VehicleSaleInquiryRateLimitResult =
  | { ok: true }
  | { ok: false; error: string };

export async function checkVehicleSaleInquiryRateLimit(args: {
  listingId: string;
  buyerEmail: string;
  ipHash: string | null;
  now?: Date;
}): Promise<VehicleSaleInquiryRateLimitResult> {
  const windowStart = vehicleSaleInquiryRateLimitWindowStart(args.now);
  const normalizedEmail = args.buyerEmail.trim().toLowerCase();
  const activeOnly = { status: { not: "SPAM" as const } };

  const [listingCount, emailCount, ipCount] = await Promise.all([
    prisma.vehicleSaleInquiry.count({
      where: {
        listingId: args.listingId,
        submittedAt: { gte: windowStart },
        ...activeOnly,
      },
    }),
    prisma.vehicleSaleInquiry.count({
      where: {
        buyerEmail: normalizedEmail,
        submittedAt: { gte: windowStart },
        ...activeOnly,
      },
    }),
    args.ipHash
      ? prisma.vehicleSaleInquiry.count({
          where: {
            ipHash: args.ipHash,
            submittedAt: { gte: windowStart },
            ...activeOnly,
          },
        })
      : Promise.resolve(0),
  ]);

  if (listingCount >= VEHICLE_SALE_INQUIRY_RATE_LIMITS.perListingPerHour) {
    return {
      ok: false,
      error:
        "Too many inquiries for this vehicle in the last hour. Please try again later.",
    };
  }

  if (emailCount >= VEHICLE_SALE_INQUIRY_RATE_LIMITS.perEmailPerHour) {
    return {
      ok: false,
      error:
        "Too many inquiries from this email address. Please try again later.",
    };
  }

  if (
    args.ipHash &&
    ipCount >= VEHICLE_SALE_INQUIRY_RATE_LIMITS.perIpHashPerHour
  ) {
    return {
      ok: false,
      error: "Too many inquiries from your network. Please try again later.",
    };
  }

  return { ok: true };
}
