import { prisma } from "@/lib/db";
import { canManageEvent } from "@/lib/auth";

/** Listed events (scheduled or published) are public; drafts only if the viewer can manage the event. */
export async function getEventForViewer(
  eventId: string,
  viewerUserId: string | null
) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          logo: true,
          stripeAccountId: true,
          stripeChargesEnabled: true,
        },
      },
    },
  });

  if (!event) return null;
  if (event.status === "PUBLISHED" || event.status === "SCHEDULED") return event;
  if (!viewerUserId) return null;
  const ok = await canManageEvent(viewerUserId, eventId);
  return ok ? event : null;
}
