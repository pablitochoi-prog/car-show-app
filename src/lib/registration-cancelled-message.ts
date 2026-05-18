import { prisma } from "@/lib/db";
import { formatEventShowNumber } from "@/lib/event-show-number";
import { registrationClubCollectedCents } from "@/lib/registration-row-money";

export function formatEventVenueLabel(event: {
  venue: string | null;
  city: string | null;
  state: string | null;
}): string {
  const venue = event.venue?.trim();
  if (venue) return venue;
  if (event.city && event.state) return `${event.city}, ${event.state}`;
  return event.city || event.state || "TBD";
}

export function formatEventDateMMDDYYYY(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

export function buildRegistrationCancelledMessageBody(input: {
  eventName: string;
  eventVenue: string;
  eventDate: string;
}): string {
  return `Your registration for ${input.eventName} at ${input.eventVenue} on ${input.eventDate} has been cancelled. No refund has been issued.`;
}

async function resolveRegistrationRecipientUserId(reg: {
  userId: string | null;
  guestEmail: string | null;
  user: { id: string } | null;
}): Promise<string | null> {
  let recipientUserId = reg.userId ?? reg.user?.id ?? null;
  if (!recipientUserId && reg.guestEmail) {
    const match = await prisma.user.findFirst({
      where: { email: { equals: reg.guestEmail.trim(), mode: "insensitive" } },
      select: { id: true },
    });
    recipientUserId = match?.id ?? null;
  }
  return recipientUserId;
}

/** In-app message to registrant after organizer cancels without refund. */
export async function sendRegistrationCancelledMessage(input: {
  registrationId: string;
  senderUserId: string;
}): Promise<{ sent: boolean }> {
  const reg = await prisma.registration.findUnique({
    where: { id: input.registrationId },
    select: {
      userId: true,
      guestEmail: true,
      paymentStatus: true,
      amountCents: true,
      platformFeeCents: true,
      guestVehicles: true,
      user: { select: { id: true } },
      tier: { select: { priceCents: true } },
      vehicles: { select: { id: true } },
      event: {
        select: {
          id: true,
          name: true,
          showNumber: true,
          startDate: true,
          venue: true,
          city: true,
          state: true,
          orgId: true,
          registrationFeeType: true,
        },
      },
    },
  });

  if (!reg?.event) return { sent: false };

  const clubCollectedCents = registrationClubCollectedCents(
    {
      paymentStatus: reg.paymentStatus,
      amountCents: reg.amountCents,
      platformFeeCents: reg.platformFeeCents,
      tier: reg.tier,
      vehicles: reg.vehicles,
      guestVehicles: reg.guestVehicles,
    },
    { registrationFeeType: reg.event.registrationFeeType ?? "FREE" },
  );

  if (clubCollectedCents > 0) return { sent: false };

  const recipientUserId = await resolveRegistrationRecipientUserId(reg);
  if (!recipientUserId) return { sent: false };

  const eventVenue = formatEventVenueLabel(reg.event);
  const eventDate = formatEventDateMMDDYYYY(reg.event.startDate);
  const body = buildRegistrationCancelledMessageBody({
    eventName: reg.event.name,
    eventVenue,
    eventDate,
  });
  const eventIdLabel = formatEventShowNumber(reg.event.showNumber);

  await prisma.message.create({
    data: {
      type: "GENERAL",
      subject: `Registration cancelled: ${eventIdLabel} ${reg.event.name}`,
      body,
      senderUserId: input.senderUserId,
      recipientUserId,
      eventId: reg.event.id,
      orgId: reg.event.orgId,
    },
  });

  return { sent: true };
}
