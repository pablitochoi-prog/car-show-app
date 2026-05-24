import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export type FulfillPlatformSetupFeeResult = {
  eventId: string;
  paid: boolean;
};

/**
 * Mark an event's flat platform fee paid from a direct platform Checkout session.
 */
export async function fulfillPlatformSetupFeeFromCheckoutSession(
  sessionId: string,
): Promise<FulfillPlatformSetupFeeResult | null> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.metadata?.checkoutType !== "platform_setup_fee") {
    return null;
  }

  const eventId = session.metadata?.eventId;
  if (!eventId) return null;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      platformSetupFeeCollected: true,
    },
  });

  if (!event) return null;

  if (event.platformSetupFeeCollected) {
    return { eventId, paid: true };
  }

  if (session.payment_status !== "paid") {
    return { eventId, paid: false };
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      platformSetupFeeCollected: true,
      platformFeeMode: "FLAT_EVENT",
      paymentEnabled: true,
    },
  });

  return { eventId, paid: true };
}
