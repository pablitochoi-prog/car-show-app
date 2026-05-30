import { prisma } from "@/lib/db";
import { sendRegistrationConfirmation } from "@/lib/email/sendgrid";
import {
  formatEventVenueLabel,
} from "@/lib/registration-cancelled-message";
import { getSiteOrigin } from "@/lib/site-url";
import { formatHhMmAs12hLabel } from "@/lib/time-12h";

function formatRegistrationEventDateLabel(
  startDate: Date,
  startTime: string | null,
): string {
  const datePart = startDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const clock = formatHhMmAs12hLabel(startTime?.trim() ?? "");
  return clock ? `${datePart} · ${clock}` : datePart;
}

function resolveRecipientName(registration: {
  user: {
    name: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  guestFirstName: string | null;
  guestLastName: string | null;
}): string | null {
  if (registration.user) {
    const fromParts = [registration.user.firstName, registration.user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    return fromParts || registration.user.name.trim() || null;
  }

  const guestName = [registration.guestFirstName, registration.guestLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return guestName || null;
}

function buildRegistrationUrl(input: {
  eventId: string;
  status: string;
  userId: string | null;
}): string {
  const origin = getSiteOrigin();
  if (input.userId) {
    return `${origin}/events/${input.eventId}/register/edit`;
  }
  return `${origin}/events/${input.eventId}/register/success?status=${encodeURIComponent(input.status)}`;
}

/**
 * Sends registration confirmation email after a successful save.
 * Never throws — registration must succeed even if email fails.
 */
export async function notifyRegistrationConfirmationEmail(
  registrationId: string,
): Promise<void> {
  try {
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        status: true,
        userId: true,
        guestEmail: true,
        guestFirstName: true,
        guestLastName: true,
        user: {
          select: {
            email: true,
            name: true,
            firstName: true,
            lastName: true,
          },
        },
        event: {
          select: {
            id: true,
            name: true,
            showNumber: true,
            startDate: true,
            startTime: true,
            venue: true,
            city: true,
            state: true,
          },
        },
      },
    });

    if (!registration || registration.status === "CANCELLED") {
      return;
    }

    const to =
      registration.user?.email?.trim().toLowerCase() ??
      registration.guestEmail?.trim().toLowerCase() ??
      "";

    if (!to) {
      console.warn("[registration-email] Skipped — no registrant email", {
        registrationId,
      });
      return;
    }

    const event = registration.event;
    const result = await sendRegistrationConfirmation({
      to,
      recipientName: resolveRecipientName(registration),
      eventName: event.name,
      eventShowNumber: event.showNumber,
      eventDateLabel: formatRegistrationEventDateLabel(
        event.startDate,
        event.startTime,
      ),
      venueLabel: formatEventVenueLabel(event),
      registrationUrl: buildRegistrationUrl({
        eventId: event.id,
        status: registration.status,
        userId: registration.userId,
      }),
      confirmed: registration.status === "CONFIRMED",
    });

    if (result.sent) {
      console.info("[registration-email] Sent registration confirmation", {
        registrationId,
        to,
        messageId: result.messageId ?? null,
      });
    } else if (result.skipped) {
      console.warn("[registration-email] Skipped", {
        registrationId,
        to,
        reason: result.reason,
      });
    } else {
      console.error("[registration-email] Failed", {
        registrationId,
        to,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("[registration-email] Unexpected error", {
      registrationId,
      error,
    });
  }
}
