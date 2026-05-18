import { prisma } from "@/lib/db";
import { formatEventShowNumber } from "@/lib/event-show-number";
import { formatMoney } from "@/lib/format-money";

export function buildRefundProcessedMessageBody(input: {
  firstName: string;
  clubName: string;
  refundCents: number;
  eventShowNumber: number;
  eventName: string;
  eventStartDate: Date;
}): string {
  const eventIdLabel = formatEventShowNumber(input.eventShowNumber);
  const eventDate = input.eventStartDate.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
  const refundAmount = formatMoney(input.refundCents);

  return `${input.firstName}, ${input.clubName} has just processed a refund transaction in the amount of ${refundAmount} for ${eventIdLabel} ${input.eventName} that takes place on ${eventDate}.  Please allow up to 7 days for refund to process.`;
}

/** In-app message to registrant after an organizer-initiated Stripe refund. */
export async function sendRefundProcessedMessage(input: {
  registrationId: string;
  refundCents: number;
  senderUserId: string;
}): Promise<{ sent: boolean }> {
  const reg = await prisma.registration.findUnique({
    where: { id: input.registrationId },
    select: {
      userId: true,
      guestEmail: true,
      guestFirstName: true,
      registrantFirstName: true,
      user: { select: { id: true, firstName: true } },
      event: {
        select: {
          id: true,
          name: true,
          showNumber: true,
          startDate: true,
          orgId: true,
          organization: { select: { name: true } },
        },
      },
    },
  });

  if (!reg?.event) return { sent: false };

  let recipientUserId = reg.userId ?? reg.user?.id ?? null;
  if (!recipientUserId && reg.guestEmail) {
    const match = await prisma.user.findFirst({
      where: { email: { equals: reg.guestEmail.trim(), mode: "insensitive" } },
      select: { id: true },
    });
    recipientUserId = match?.id ?? null;
  }

  if (!recipientUserId) return { sent: false };

  const firstName =
    reg.user?.firstName?.trim() ||
    reg.registrantFirstName?.trim() ||
    reg.guestFirstName?.trim() ||
    "Registrant";

  const clubName = reg.event.organization?.name ?? "Your club";
  const eventIdLabel = formatEventShowNumber(reg.event.showNumber);
  const body = buildRefundProcessedMessageBody({
    firstName,
    clubName,
    refundCents: input.refundCents,
    eventShowNumber: reg.event.showNumber,
    eventName: reg.event.name,
    eventStartDate: reg.event.startDate,
  });

  await prisma.message.create({
    data: {
      type: "GENERAL",
      subject: `Refund processed: ${eventIdLabel} ${reg.event.name}`,
      body,
      senderUserId: input.senderUserId,
      recipientUserId,
      eventId: reg.event.id,
      orgId: reg.event.orgId,
    },
  });

  return { sent: true };
}
