import { prisma } from "@/lib/db";

export type EventSaleInquiryStats = {
  forSaleVehicleCount: number;
  inquiryCount: number;
};

/** Organizer-visible counts only — no buyer PII. */
export async function loadEventSaleInquiryStats(
  eventId: string,
): Promise<EventSaleInquiryStats> {
  const [forSaleVehicleCount, inquiryCount] = await Promise.all([
    prisma.vehicleSaleListing.count({
      where: {
        eventId,
        enabled: true,
        sellerAcknowledgedAt: { not: null },
      },
    }),
    prisma.vehicleSaleInquiry.count({
      where: {
        eventId,
        status: { notIn: ["SPAM", "ARCHIVED"] },
      },
    }),
  ]);

  return { forSaleVehicleCount, inquiryCount };
}
