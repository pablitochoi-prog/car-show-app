import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, canManageEvent } from "@/lib/auth";
import { EventForm, type EventInitial } from "@/components/forms/event-form";
import { parseDailyHours } from "@/lib/daily-hours";
import { getEventStaffList, listEventRoleDefinitions } from "@/lib/event-staff";
import { EventStaffManager } from "@/components/forms/event-staff-manager";
import { EventCategoriesSection } from "@/components/forms/event-categories-section";
import { EventAwardsSection } from "@/components/forms/event-awards-section";
import { CollapsibleCard } from "@/components/ui/collapsible-card";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      organization: { select: { id: true, name: true } },
    },
  });

  if (!event) notFound();

  const allowed = await canManageEvent(user.id, id, event.orgId, user.platformRole);
  if (!allowed) notFound();

  const [memberships, staff, staffRoleDefinitions, tierRows] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: {
        organization: { select: { id: true, name: true, clubState: true } },
      },
      orderBy: { organization: { name: "asc" } },
    }),
    getEventStaffList(id),
    listEventRoleDefinitions(id),
    prisma.registrationTier.findMany({
      where: { eventId: id },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const initialTiers = tierRows.map((t) => ({
    id: t.id,
    name: t.name,
    priceCents: t.priceCents,
    opensAt: t.opensAt?.toISOString() ?? null,
    closesAt: t.closesAt?.toISOString() ?? null,
    memberOnly: t.memberOnly,
    sortOrder: t.sortOrder,
  }));

  const organizations = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    clubState: m.organization.clubState ?? null,
  }));

  const listingEditable =
    event.status === "DRAFT" ||
    event.status === "SCHEDULED" ||
    event.status === "PUBLISHED";

  const initial: EventInitial = {
    id: event.id,
    orgId: event.orgId ?? null,
    name: event.name,
    estimatedCarCount: event.estimatedCarCount ?? null,
    description: event.description,
    venue: event.venue,
    street: event.street,
    city: event.city,
    state: event.state,
    zip: event.zip,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate?.toISOString() ?? null,
    startTime: event.startTime,
    endTime: event.endTime,
    isMultiDay: event.isMultiDay,
    dailyHours: parseDailyHours(event.dailyHours) ?? undefined,
    registrationFeeType: event.registrationFeeType,
    registrationFeeDollars: event.registrationFeeDollars,
    contactName: event.contactName,
    contactFirstName: event.contactFirstName,
    contactLastName: event.contactLastName,
    contactEmail: event.contactEmail,
    contactPhone: event.contactPhone,
    eventWebsite: event.eventWebsite,
    socialHashtag: event.socialHashtag,
    eventType: event.eventType,
    status:
      event.status === "DRAFT"
        ? "DRAFT"
        : event.status === "SCHEDULED"
          ? "SCHEDULED"
          : event.status === "PUBLISHED"
            ? "PUBLISHED"
            : "DRAFT",
    statusReadOnly: !listingEditable,
    listingScheduledAt: event.listingScheduledAt?.toISOString() ?? null,
    lat: event.lat,
    lng: event.lng,
    persistedEventStatus: event.status,
    flyerUrl: event.flyerUrl,
    logoUrl: event.logoUrl,
  };

  return (
    <div className="page-shell max-w-5xl space-y-8">
      <div className="mx-auto max-w-2xl text-center sm:text-left">
        <Link
          href="/dashboard/events"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to my events
        </Link>
      </div>

      {!event.orgId ? (
        <div className="mx-auto max-w-2xl rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          This event is not linked to an organization yet.{" "}
          <Link
            href={`/organizer/events/${event.id}/organization`}
            className="font-medium text-primary underline underline-offset-4"
          >
            Link a club or organization
          </Link>{" "}
          before publishing.
        </div>
      ) : null}

      <EventForm
        key={event.updatedAt.toISOString()}
        initial={initial}
        organizations={organizations}
        eventId={event.id}
        initialTiers={initialTiers}
        betweenOrganizerAndActions={
          <>
            <CollapsibleCard title="Event Staffing" defaultOpen={false}>
              <EventStaffManager
                key={event.id}
                eventId={event.id}
                initialStaff={staff}
                initialRoleDefinitions={staffRoleDefinitions}
              />
            </CollapsibleCard>
            <CollapsibleCard title="Registration Categories" defaultOpen={false}>
              <EventCategoriesSection eventId={event.id} />
            </CollapsibleCard>
            <CollapsibleCard title="Awards &amp; Trophies" defaultOpen={false}>
              <EventAwardsSection eventId={event.id} />
            </CollapsibleCard>
          </>
        }
      />
    </div>
  );
}
