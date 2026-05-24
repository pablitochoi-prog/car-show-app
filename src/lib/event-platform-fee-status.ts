import { prisma } from "@/lib/db";
import {
  dashCardsBlockedMessage,
  isEventPlatformFeePaid,
  type EventPlatformFeeMode,
} from "@/lib/event-platform-fee";

export type EventPlatformFeeStatus = {
  paymentEnabled: boolean;
  platformFeeMode: EventPlatformFeeMode;
  platformSetupFeeCollected: boolean;
  hasCompletedPaidCheckout: boolean;
  paid: boolean;
  dashCardsBlockedMessage: string;
};

export async function getEventPlatformFeeStatus(
  eventId: string,
): Promise<EventPlatformFeeStatus | null> {
  const [event, paidCheckout] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      select: {
        paymentEnabled: true,
        platformFeeMode: true,
        platformSetupFeeCollected: true,
      },
    }),
    prisma.registration.findFirst({
      where: {
        eventId,
        paymentStatus: "PAID",
        stripePaymentIntentId: { not: null },
      },
      select: { id: true },
    }),
  ]);

  if (!event) return null;

  const hasCompletedPaidCheckout = paidCheckout != null;
  const paid = isEventPlatformFeePaid({
    paymentEnabled: event.paymentEnabled,
    platformFeeMode: event.platformFeeMode,
    platformSetupFeeCollected: event.platformSetupFeeCollected,
    hasCompletedPaidCheckout,
  });

  return {
    paymentEnabled: event.paymentEnabled,
    platformFeeMode: event.platformFeeMode,
    platformSetupFeeCollected: event.platformSetupFeeCollected,
    hasCompletedPaidCheckout,
    paid,
    dashCardsBlockedMessage: dashCardsBlockedMessage(event.platformFeeMode),
  };
}
