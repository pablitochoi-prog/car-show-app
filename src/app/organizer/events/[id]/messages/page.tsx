import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEventAndLoad } from "@/lib/auth";
import { requireStaffStepUpPage } from "@/lib/require-organizer-step-up";
import { getEventStaffList } from "@/lib/event-staff";
import { EventNameWithNumber } from "@/components/events/event-name-with-number";
import { OrganizerMessagesClient } from "@/components/messages/organizer-messages-client";
import { EventOrganizerNav } from "@/components/organizer/event-organizer-nav";
import { ContactSiteAdminButton } from "@/components/organizer/contact-site-admin-button";
import { formatEventShowNumber } from "@/lib/event-show-number";

export default async function OrganizerEventMessagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id: eventId } = await params;

  await requireStaffStepUpPage({
    user,
    pathname: `/organizer/events/${eventId}/messages`,
  });

  const { allowed, event } = await canManageEventAndLoad(
    user.id,
    eventId,
    user.platformRole,
  );
  if (!allowed || !event) notFound();

  const [messages, staff] = await Promise.all([
    prisma.message.findMany({
      where: { eventId },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        recipient: { select: { id: true, name: true, email: true } },
        event: { select: { id: true, name: true, showNumber: true } },
        organization: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getEventStaffList(eventId),
  ]);

  const organizerContacts = staff
    .filter((s) => s.roles.some((r) => r.slug === "organizer"))
    .map((s) => ({ name: s.name, email: s.email }));

  const serialized = messages.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
  }));

  return (
    <div className="page-shell max-w-6xl space-y-6">
      <div className="text-center sm:text-left">
        <Link
          href="/dashboard/events?tab=managing"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← My events
        </Link>
      </div>

      <div className="space-y-4">
        <EventOrganizerNav eventId={eventId} active="messages" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Event Messages —{" "}
              <EventNameWithNumber
                name={event.name}
                showNumber={event.showNumber}
              />
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {messages.length} message{messages.length !== 1 ? "s" : ""} for this
              event.
            </p>
          </div>
          <ContactSiteAdminButton
            eventId={eventId}
            eventLabel={`${formatEventShowNumber(event.showNumber)} ${event.name}`}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/25 px-4 py-3 text-sm">
        <p className="font-medium text-foreground">Message &amp; refund inbox</p>
        <p className="mt-1 text-muted-foreground">
          Logged-in registrants can message the event organizer about this show or
          request a refund. Those messages go to the organizer account(s) listed
          below (same as the <strong>Organizer</strong> role under Event Staffing
          on the Edit Event page).
        </p>
        {organizerContacts.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {organizerContacts.map((c) => (
              <li key={c.email} className="text-foreground">
                <span className="font-medium">{c.name}</span>
                <span className="text-muted-foreground"> · {c.email}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-amber-800 dark:text-amber-200">
            No organizer is assigned yet. Add at least one person with the
            Organizer role under <strong>Event Staffing</strong> so registrants can
            reach you.
          </p>
        )}
      </div>

      <OrganizerMessagesClient
        initialMessages={serialized}
        currentUserId={user.id}
      />
    </div>
  );
}
